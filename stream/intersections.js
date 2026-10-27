/**
 * Named-street intersections.
 *
 * A second PBF read (way nodes enabled) finds coordinates shared by two
 * differently named highways. Each pair becomes one layer=intersection
 * document. Pelias already searches "Street A & Street B" for queries like
 * "Lex and 53rd"; short aliases cover that form.
 *
 * Enabled per import entry with importIntersections: true.
 */

const fs = require('fs');
const path = require('path');
const { Readable, pipeline } = require('stream');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const Document = require('pelias-model').Document;

const HIGHWAY_VALUES = new Set([
  'residential', 'tertiary', 'secondary', 'primary',
  'living_street', 'unclassified', 'pedestrian', 'service', 'road'
]);

const HIGHWAY_TAGS = [
  'highway~residential+name',
  'highway~tertiary+name',
  'highway~secondary+name',
  'highway~primary+name',
  'highway~living_street+name',
  'highway~unclassified+name',
  'highway~pedestrian+name',
  'highway~service+name',
  'highway~road+name'
];

const AVENUE_ALIASES = {
  'lexington avenue': 'Lex'
};

function cleanStreetName(name) {
  if (!name) return '';
  return String(name).split(';')[0].trim();
}

function shortStreetName(name) {
  const cleaned = cleanStreetName(name);
  if (!cleaned) return null;
  const avenue = AVENUE_ALIASES[cleaned.toLowerCase()];
  if (avenue) return avenue;
  const ordinal = cleaned.match(/^(?:(?:east|west|north|south)\s+)?(\d+)(st|nd|rd|th)\s+street$/i);
  if (!ordinal) return null;
  return ordinal[1] + ordinal[2].toLowerCase();
}

function intersectionLabels(streetA, streetB) {
  const pair = [cleanStreetName(streetA), cleanStreetName(streetB)].sort((a, b) => a.localeCompare(b));
  const display = pair[0] + ' & ' + pair[1];
  const aliases = new Set();
  const add = (value) => {
    if (value && value !== display) aliases.add(value);
  };

  add(pair[1] + ' & ' + pair[0]);

  const short = pair.map(shortStreetName);
  if (short[0]) {
    add(short[0] + ' & ' + pair[1]);
    add(pair[1] + ' & ' + short[0]);
  }
  if (short[1]) {
    add(pair[0] + ' & ' + short[1]);
    add(short[1] + ' & ' + pair[0]);
  }
  if (short[0] && short[1]) {
    add(short[0] + ' & ' + short[1]);
    add(short[1] + ' & ' + short[0]);
  }

  return { street: pair[0], crossStreet: pair[1], display: display, aliases: Array.from(aliases) };
}

function coordKey(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  if (latitude === 0 && longitude === 0) return '';
  return latitude.toFixed(6) + ',' + longitude.toFixed(6);
}

// One V8 Map cannot hold more than 2^24 entries. Great Britain alone has
// more named-street nodes than that, so nodes are split across shards.
const SHARD_COUNT = 64;

function createNodeStore() {
  const shards = [];
  for (let i = 0; i < SHARD_COUNT; i++) shards.push(new Map());
  return { shards: shards };
}

function shardIndex(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 33 + key.charCodeAt(i)) >>> 0;
  }
  return hash % SHARD_COUNT;
}

function rememberNode(store, lat, lon, streetName) {
  const key = coordKey(lat, lon);
  const name = cleanStreetName(streetName);
  if (!key || !name) return;
  const nodeMap = store.shards[shardIndex(key)];
  const existing = nodeMap.get(key);
  if (!existing) {
    nodeMap.set(key, name);
    return;
  }
  if (typeof existing === 'string') {
    if (existing !== name) nodeMap.set(key, new Set([existing, name]));
    return;
  }
  existing.add(name);
}

function ingestWay(store, way) {
  if (!way || way.type !== 'way' || !way.tags) return;
  if (!HIGHWAY_VALUES.has(way.tags.highway)) return;
  const name = cleanStreetName(way.tags.name);
  if (!name || !Array.isArray(way.nodes)) return;
  way.nodes.forEach((node) => rememberNode(store, node.lat, node.lon, name));
}

function buildIntersections(store) {
  const found = [];
  store.shards.forEach((nodeMap) => {
    nodeMap.forEach((names, key) => {
      const list = typeof names === 'string' ? [names] : Array.from(names);
      if (list.length < 2) return;
      list.sort((a, b) => a.localeCompare(b));
      const parts = key.split(',');
      const lat = Number(parts[0]);
      const lon = Number(parts[1]);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          found.push({ lat: lat, lon: lon, a: list[i], b: list[j] });
        }
      }
    });
  });
  return found;
}

function slug(name) {
  return cleanStreetName(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
}

function createIntersectionDocument(item) {
  try {
    const labels = intersectionLabels(item.a, item.b);
    if (!labels.street || !labels.crossStreet || !labels.display) return null;

    const id = [
      'intersection',
      item.lat.toFixed(6),
      item.lon.toFixed(6),
      slug(labels.street),
      slug(labels.crossStreet)
    ].join('_');

    // Setters return undefined when the value is empty after cleanup, so they
    // must not be chained. One bad OSM name must not abort the whole country.
    const doc = new Document('openstreetmap', 'intersection', id);
    if (!doc.setCentroid({ lat: item.lat, lon: item.lon })) return null;
    if (!doc.setName('default', labels.display)) return null;
    if (!doc.setAddress('street', labels.street)) return null;
    if (!doc.setAddress('cross_street', labels.crossStreet)) return null;

    labels.aliases.forEach((alias) => {
      try {
        doc.setNameAlias('default', alias);
      } catch (aliasErr) {
        // skip this alias
      }
    });
    return doc;
  } catch (err) {
    return null;
  }
}

function readIntersections(file, leveldb) {
  const pbf2json = require('pbf2json');
  fs.mkdirSync(leveldb, { recursive: true });
  const nodeStore = createNodeStore();
  let ways = 0;

  return new Promise((resolve, reject) => {
    const stream = pbf2json.createReadStream({
      file: file,
      leveldb: leveldb,
      waynodes: true,
      tags: HIGHWAY_TAGS
    });
    stream.on('data', (way) => {
      ways++;
      ingestWay(nodeStore, way);
    });
    stream.on('error', reject);
    stream.on('end', () => {
      const intersections = buildIntersections(nodeStore);
      peliasLogger.info(
        '[intersections] %s: %d named ways, %d intersections',
        path.basename(file),
        ways,
        intersections.length
      );
      resolve(intersections);
    });
  });
}

function indexDocuments(docs) {
  // pelias-dbclient caches the esclient config object and marks it used.
  // Pass 2 already created a client in this process, so load a fresh one.
  const clientPath = require.resolve('pelias-dbclient/src/client');
  delete require.cache[clientPath];

  const adminLookup = require('pelias-wof-admin-lookup').create;
  const blacklist = require('pelias-blacklist-stream');
  const categoryMapper = require('./category_mapper');
  const popularityMapper = require('./popularity_mapper');
  const dbMapper = require('pelias-model').createDocumentMapperStream;
  const elasticsearch = require('pelias-dbclient');
  const categoryDefaults = require('../config/category_map');

  return new Promise((resolve, reject) => {
    pipeline(
      Readable.from(docs, { objectMode: true }),
      adminLookup(),
      blacklist(),
      categoryMapper(categoryDefaults),
      popularityMapper(),
      dbMapper(),
      elasticsearch({ name: 'openstreetmap' }),
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function importFromConfig() {
  const peliasConfig = require('pelias-config').generate();
  const _ = require('lodash');
  const entries = _.get(peliasConfig, 'imports.openstreetmap.import', []);
  const wanted = entries.filter((entry) => entry && entry.importIntersections);
  if (!wanted.length) {
    peliasLogger.info('[intersections] importIntersections is not set, skipping');
    return { skipped: true, count: 0 };
  }

  const onlyFiles = String(process.env.INTERSECTIONS_FILES || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  let selected = wanted;
  if (onlyFiles.length) {
    selected = wanted.filter((entry) => onlyFiles.indexOf(entry.filename) !== -1);
  }
  if (!selected.length) {
    throw new Error('no intersection files matched INTERSECTIONS_FILES');
  }

  const datapath = peliasConfig.imports.openstreetmap.datapath;
  const leveldbBase = peliasConfig.imports.openstreetmap.leveldbpath;
  let count = 0;
  let skipped = 0;

  for (let i = 0; i < selected.length; i++) {
    const file = path.join(datapath, selected[i].filename);
    if (!fs.existsSync(file)) {
      throw new Error('intersection import file not found: ' + file);
    }
    const leveldb = path.join(leveldbBase, 'intersection-nodes-' + i);
    const found = await readIntersections(file, leveldb);
    const docs = [];
    let fileSkipped = 0;
    found.forEach((item) => {
      const doc = createIntersectionDocument(item);
      if (doc) docs.push(doc);
      else fileSkipped++;
    });
    skipped += fileSkipped;
    peliasLogger.info(
      '[intersections] indexing %d documents from %s (%d skipped)',
      docs.length,
      path.basename(file),
      fileSkipped
    );
    if (docs.length) {
      await indexDocuments(docs);
      count += docs.length;
    }
  }

  return { skipped: false, count: count, skippedDocuments: skipped };
}

module.exports = {
  shortStreetName: shortStreetName,
  intersectionLabels: intersectionLabels,
  createNodeStore: createNodeStore,
  ingestWay: ingestWay,
  buildIntersections: buildIntersections,
  createIntersectionDocument: createIntersectionDocument,
  importFromConfig: importFromConfig
};
