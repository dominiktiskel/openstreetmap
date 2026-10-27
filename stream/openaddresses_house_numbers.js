/**
 * Merge OpenAddresses house numbers into the OSM street aggregation.
 *
 * Runs after Pass 1 and before Pass 2. OA numbers are appended to the same
 * LevelDB street record the OSM importer already built, so Pass 2 emits one
 * street document whose addendum.osm.house_numbers is the union.
 *
 * OA-only numbers are marked listOnly. They appear in house_numbers but Pass 2
 * does not emit a second address document for them (the stock OA importer owns
 * those points).
 *
 * Street names are normalized only for matching (CHAPEL ST === Chapel Street).
 * The stored display name stays the OSM name when the street already exists.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const { STREETS_DB_PATH } = require('../util/leveldb_paths');

const DIRECTIONALS = {
  n: 'north', s: 'south', e: 'east', w: 'west',
  ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
  north: 'north', south: 'south', east: 'east', west: 'west',
  northeast: 'northeast', northwest: 'northwest', southeast: 'southeast', southwest: 'southwest'
};

const SUFFIXES = {
  st: 'street', street: 'street',
  ave: 'avenue', avenue: 'avenue', av: 'avenue',
  rd: 'road', road: 'road',
  dr: 'drive', drive: 'drive',
  ln: 'lane', lane: 'lane',
  ct: 'court', court: 'court',
  pl: 'place', place: 'place',
  ter: 'terrace', terrace: 'terrace', trce: 'terrace',
  blvd: 'boulevard', boulevard: 'boulevard',
  hwy: 'highway', highway: 'highway',
  pkwy: 'parkway', parkway: 'parkway',
  cir: 'circle', circle: 'circle',
  way: 'way'
};

const LOOKUP_CONCURRENCY = 32;

function tokenize(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’.]+/g, '')
    .split(/[^0-9a-z\u00c0-\u024f]+/)
    .filter(Boolean);
}

function normalizeTokens(name) {
  const parts = tokenize(name);
  if (parts.length === 0) return [];
  if (parts.length > 1 && DIRECTIONALS[parts[0]]) {
    parts[0] = DIRECTIONALS[parts[0]];
  }
  const last = parts[parts.length - 1];
  if (SUFFIXES[last]) {
    parts[parts.length - 1] = SUFFIXES[last];
  }
  return parts;
}

function normalizeStreetName(name) {
  return normalizeTokens(name).join(' ');
}

function titleCaseWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function displayStreetName(name) {
  return normalizeTokens(name).map(titleCaseWord).join(' ');
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseWord)
    .join(' ');
}

function cell(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : '0.0';
}

function matchKey(street, city, lat, lon) {
  return [
    normalizeStreetName(street),
    String(city || '').trim().toLowerCase(),
    cell(lat),
    cell(lon)
  ].join('|');
}

function parseAggregateKey(key) {
  const parts = String(key).split('|');
  const lon = parts.length >= 1 ? parts.pop() : '0.0';
  const lat = parts.length >= 1 ? parts.pop() : '0.0';
  const city = parts.length >= 1 ? parts.pop() : '';
  return { street: parts.join('|'), city: city, lat: lat, lon: lon };
}

function numberValue(item) {
  if (typeof item === 'object' && item !== null && item.num !== undefined) {
    return String(item.num);
  }
  return String(item);
}

function naturalSort(a, b) {
  const aParts = String(a).match(/(\d+)|(\D+)/g) || [];
  const bParts = String(b).match(/(\d+)|(\D+)/g) || [];
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    const aIsNum = /^\d+$/.test(aPart);
    const bIsNum = /^\d+$/.test(bPart);

    if (aIsNum && bIsNum) {
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10);
      if (diff !== 0) return diff;
    } else {
      const comp = aPart.toLowerCase().localeCompare(bPart.toLowerCase());
      if (comp !== 0) return comp;
    }
  }
  return 0;
}

function sortNumbers(numbers) {
  return (numbers || []).slice().sort((a, b) => naturalSort(numberValue(a), numberValue(b)));
}

function hasNumber(aggregate, number) {
  return (aggregate.numbers || []).some((item) => numberValue(item) === number);
}

function emitsAddressDocument(item) {
  return !(item && typeof item === 'object' && item.listOnly === true);
}

function emptyAdmin() {
  return {
    locality: '',
    localadmin: '',
    county: '',
    borough: '',
    neighbourhood: '',
    region: '',
    country: ''
  };
}

function indexKeyForAggregate(leveldbKey, aggregate) {
  const parsed = parseAggregateKey(leveldbKey);
  const street = (aggregate && aggregate.streetName) || parsed.street;
  const city = (aggregate && aggregate.osmAdmin && aggregate.osmAdmin.locality) || parsed.city;
  if (!street) return '';
  return matchKey(street, city, parsed.lat, parsed.lon);
}

function buildMatchIndex(aggregates) {
  const index = new Map();
  for (const [key, aggregate] of aggregates) {
    const mk = indexKeyForAggregate(key, aggregate);
    if (!mk) continue;
    const existingKey = index.get(mk);
    if (!existingKey) {
      index.set(mk, key);
      continue;
    }
    const existing = aggregates.get(existingKey);
    const existingCount = (existing.numbers || []).length;
    const candidateCount = (aggregate.numbers || []).length;
    if (candidateCount > existingCount) {
      index.set(mk, key);
    }
  }
  return index;
}

function ensureNumbersArray(aggregate) {
  if (!Array.isArray(aggregate.numbers)) {
    aggregate.numbers = [];
  }
}

/**
 * Add one OA point to the in-memory aggregation.
 * Returns 'merged', 'created', 'duplicate', or 'skipped'.
 */
function applyOpenAddressPoint(aggregates, index, point) {
  const number = String(point.number || '').trim();
  const street = String(point.street || '').trim();
  if (!number || !street) return 'skipped';
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return 'skipped';

  const city = point.locality || '';
  const mk = matchKey(street, city, point.lat, point.lon);
  const existingKey = index.get(mk);

  if (existingKey && aggregates.has(existingKey)) {
    const aggregate = aggregates.get(existingKey);
    ensureNumbersArray(aggregate);
    if (hasNumber(aggregate, number)) return 'duplicate';
    aggregate.numbers.push({
      num: number,
      lat: point.lat,
      lon: point.lon,
      zip: point.zip || null,
      listOnly: true
    });
    return 'merged';
  }

  const display = displayStreetName(street);
  const leveldbKey = [display, city, cell(point.lat), cell(point.lon)]
    .map((part) => String(part).trim().toLowerCase())
    .join('|');

  if (aggregates.has(leveldbKey)) {
    index.set(mk, leveldbKey);
    return applyOpenAddressPoint(aggregates, index, point);
  }

  const admin = emptyAdmin();
  admin.locality = point.locality || '';
  admin.localadmin = point.localadmin || '';
  admin.county = point.county || '';
  admin.borough = point.borough || '';
  admin.neighbourhood = point.neighbourhood || '';
  admin.region = point.region || '';
  admin.country = point.country || '';

  aggregates.set(leveldbKey, {
    numbers: [{
      num: number,
      lat: point.lat,
      lon: point.lon,
      zip: point.zip || null,
      listOnly: true
    }],
    centroid: { lat: point.lat, lon: point.lon, count: 1 },
    streetName: display,
    zip: point.zip || '',
    osmAdmin: admin
  });
  index.set(mk, leveldbKey);
  return 'created';
}

function parseFeatureLine(line) {
  const trimmed = String(line || '').trim().replace(/,$/, '');
  if (!trimmed || trimmed.charAt(0) !== '{') return null;

  let feature;
  try {
    feature = JSON.parse(trimmed);
  } catch (err) {
    return null;
  }
  if (!feature || feature.type !== 'Feature' || !feature.geometry) return null;

  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const props = feature.properties || {};
  return {
    number: props.number,
    street: props.street,
    zip: props.postcode || null,
    city: props.city || '',
    lat: lat,
    lon: lon
  };
}

function adminFromLookup(result, fallbackCity) {
  const name = (type) => {
    const list = result && result[type];
    if (list && list[0] && list[0].name) return list[0].name;
    return '';
  };
  const admin = emptyAdmin();
  admin.locality = name('locality') || titleCase(fallbackCity);
  admin.localadmin = name('localadmin');
  admin.county = name('county');
  admin.borough = name('borough');
  admin.neighbourhood = name('neighbourhood');
  admin.region = name('region');
  admin.country = name('country');
  return admin;
}

function lookupAdmin(resolver, lat, lon) {
  return new Promise((resolve) => {
    resolver.lookup({ lat: lat, lon: lon }, null, (err, result) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(result || null);
    });
  });
}

async function mapPool(items, limit, fn) {
  const size = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor++;
      await fn(items[index], index);
    }
  }
  const workers = [];
  for (let i = 0; i < size; i++) workers.push(worker());
  await Promise.all(workers);
}

async function applyBatch(batch, aggregates, index, lookup, stats, dirty) {
  const resolved = new Array(batch.length);
  await mapPool(batch, LOOKUP_CONCURRENCY, async (point, i) => {
    let admin = emptyAdmin();
    admin.locality = titleCase(point.city);
    if (lookup) {
      try {
        const result = await lookup(point.lat, point.lon);
        admin = adminFromLookup(result, point.city);
      } catch (err) {
        peliasLogger.warn('[openaddresses_house_numbers] admin lookup failed: %s', err.message);
      }
    }
    resolved[i] = { point: point, admin: admin };
  });

  resolved.forEach((item) => {
    const point = item.point;
    const admin = item.admin;
    const status = applyOpenAddressPoint(aggregates, index, {
      number: point.number,
      street: point.street,
      lat: point.lat,
      lon: point.lon,
      zip: point.zip,
      locality: admin.locality,
      localadmin: admin.localadmin,
      county: admin.county,
      borough: admin.borough,
      neighbourhood: admin.neighbourhood,
      region: admin.region,
      country: admin.country
    });
    stats[status] = (stats[status] || 0) + 1;
    if (status === 'merged' || status === 'created') {
      const key = index.get(matchKey(point.street, admin.locality, point.lat, point.lon));
      if (key) dirty.add(key);
    }
  });
}

async function readFeatures(filePath, onBatch) {
  const batch = [];
  const input = fs.createReadStream(filePath);
  const lines = readline.createInterface({ input: input, crlfDelay: Infinity });
  for await (const line of lines) {
    const point = parseFeatureLine(line);
    if (!point || !point.number || !point.street) continue;
    batch.push(point);
    if (batch.length >= 500) {
      await onBatch(batch.splice(0, batch.length));
    }
  }
  if (batch.length > 0) {
    await onBatch(batch.splice(0, batch.length));
  }
}

/**
 * Load the streets LevelDB, merge OA points, write dirty keys back.
 * `lookup(lat, lon)` resolves to a PIP result object, or may be omitted.
 */
async function openLevelDbWithRetry(dbPath) {
  const { Level } = require('level');
  const MAX_RETRIES = 60;
  let retries = 0;

  while (true) {
    const db = new Level(dbPath, { valueEncoding: 'json' });
    try {
      await db.open();
      return db;
    } catch (err) {
      const cause = err.cause && err.cause.code;
      const isLocked = err.code === 'LEVEL_LOCKED' || err.code === 'LEVEL_DATABASE_NOT_OPEN' || cause === 'LEVEL_LOCKED';
      try { await db.close(); } catch (closeErr) { /* already closed */ }
      if (isLocked && retries < MAX_RETRIES - 1) {
        retries++;
        const waitTime = Math.min(1000 * retries, 10000);
        peliasLogger.warn('[openaddresses_house_numbers] Streets DB locked, retry %d/%d in %dms', retries, MAX_RETRIES, waitTime);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
}

async function mergeOpenAddresses(options) {
  const dbPath = options.dbPath;
  const filePaths = options.filePaths || [];
  const lookup = options.lookup;

  const db = await openLevelDbWithRetry(dbPath);

  const aggregates = new Map();
  for await (const [key, value] of db.iterator()) {
    aggregates.set(key, value);
  }
  const index = buildMatchIndex(aggregates);
  const dirty = new Set();
  const stats = { merged: 0, created: 0, duplicate: 0, skipped: 0, files: 0 };

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      peliasLogger.warn('[openaddresses_house_numbers] Missing file, skipping: %s', filePath);
      continue;
    }
    stats.files++;
    peliasLogger.info('[openaddresses_house_numbers] Reading %s', filePath);
    await readFeatures(filePath, (batch) => applyBatch(batch, aggregates, index, lookup, stats, dirty));
  }

  const batch = db.batch();
  for (const key of dirty) {
    const aggregate = aggregates.get(key);
    aggregate.numbers = sortNumbers(aggregate.numbers);
    batch.put(key, aggregate);
  }
  await batch.write();
  await db.close();

  peliasLogger.info(
    '[openaddresses_house_numbers] Merged %d new numbers, %d new streets, %d already present, %d files',
    stats.merged,
    stats.created,
    stats.duplicate,
    stats.files
  );
  return stats;
}

async function mergeFromConfig() {
  const peliasConfig = require('pelias-config').generate();
  const _ = require('lodash');
  const files = _.get(peliasConfig, 'imports.openaddresses.files');
  const datapath = _.get(peliasConfig, 'imports.openaddresses.datapath');

  if (!Array.isArray(files) || files.length === 0 || !datapath) {
    peliasLogger.info('[openaddresses_house_numbers] No OpenAddresses files configured, skipping');
    return { skipped: true };
  }
  if (!fs.existsSync(STREETS_DB_PATH)) {
    peliasLogger.warn('[openaddresses_house_numbers] Streets LevelDB missing, skipping');
    return { skipped: true };
  }

  const filePaths = files.map((file) => path.join(datapath, file + '.geojson'));
  const wof = require('pelias-wof-admin-lookup');
  const resolver = wof.resolver();

  try {
    return await mergeOpenAddresses({
      dbPath: STREETS_DB_PATH,
      filePaths: filePaths,
      lookup: (lat, lon) => lookupAdmin(resolver, lat, lon)
    });
  } finally {
    if (resolver && typeof resolver.end === 'function') {
      resolver.end();
    }
  }
}

module.exports = {
  normalizeStreetName: normalizeStreetName,
  displayStreetName: displayStreetName,
  matchKey: matchKey,
  buildMatchIndex: buildMatchIndex,
  applyOpenAddressPoint: applyOpenAddressPoint,
  emitsAddressDocument: emitsAddressDocument,
  parseFeatureLine: parseFeatureLine,
  mergeOpenAddresses: mergeOpenAddresses,
  mergeFromConfig: mergeFromConfig
};
