/**
  House Numbers Collector (Pass 1)

  Collects house numbers from address documents and stores them in LevelDB
  with FULL admin hierarchy from WOF lookup.

  Key Features:
  - Aggregation key includes city: "street|city|lat|lon"
  - Stores complete WOF hierarchy (from WOF lookup, not OSM tags)
  - Country always from WOF ("Polska" not "PL")
  - 0.1° coordinate precision to prevent splitting long streets
  - Per-address coordinates AND postal code stored with each house number

  Strategy:
  - Collect addresses in memory buffer (Map of street → aggregates)
  - Flush to LevelDB every BATCH_SIZE addresses (default: 2,500)
  - Flushes are SERIALIZED (one at a time) because each flush performs a
    read-merge-write cycle against LevelDB; concurrent flushes would race
    on shared street keys and silently lose house numbers.
  - Merge with existing LevelDB data on each flush (getMany + batch write)
  - Final flush at end of stream

  @version 2.10.0
  @see: pass2_document_generator.js for Pass 2
**/

const through = require('through2');
const { Level } = require('level');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();
const _ = require('lodash');
const { EventEmitter } = require('events');
const { STREETS_DB_PATH } = require('../util/leveldb_paths');

// Configuration
const ENABLE_AGGREGATION = _.get(peliasConfig, 'imports.openstreetmap.aggregateHouseNumbers', true);
const DB_PATH = STREETS_DB_PATH;

const BATCH_SIZE = 2500;  // Small batches to prevent OOM

/**
 * Generate aggregation key for V2 pipeline
 * Format: "street|city|lat|lon"
 *
 * Includes city to prevent merging streets with same name in different cities
 * Uses 0.1° precision (~11km) to avoid splitting long streets
 *
 * City priority:
 * 1. WOF locality (from parent hierarchy) - most reliable
 * 2. OSM addr:city tag - fallback
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';

  // Get city from WOF hierarchy (locality) first, then fallback to OSM tag
  let city = '';
  if (doc.parent && doc.parent.locality && doc.parent.locality[0]) {
    city = doc.parent.locality[0];  // From WOF - most reliable!
  } else {
    city = doc.getAddress('city') || '';  // Fallback to OSM addr:city
  }

  const centroid = doc.getCentroid();
  const lat = (centroid && Number.isFinite(centroid.lat)) ? centroid.lat.toFixed(1) : '0.0';  // 0.1° = ~11km
  const lon = (centroid && Number.isFinite(centroid.lon)) ? centroid.lon.toFixed(1) : '0.0';

  return [street, city, lat, lon]
    .map(s => String(s).trim().toLowerCase())
    .join('|');
}

/**
 * Natural sort for house numbers
 */
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

/**
 * Normalize a stored house number entry into Map<num, details|null>.
 * Supports:
 * - old format: plain string ("12a")
 * - intermediate format: { num, lat, lon }
 * - current format: { num, lat, lon, zip }
 */
function addStoredNumberToMap(map, item) {
  if (typeof item === 'object' && item !== null && item.num !== undefined) {
    if (!map.has(item.num)) {
      map.set(item.num, {
        lat: Number.isFinite(item.lat) ? item.lat : null,
        lon: Number.isFinite(item.lon) ? item.lon : null,
        zip: item.zip || null
      });
    }
  } else if (typeof item === 'string') {
    if (!map.has(item)) { map.set(item, null); }
  }
}

/**
 * Serialize Map<num, details|null> back into the stored array format.
 */
function numbersMapToArray(map) {
  return Array.from(map.entries())
    .map(([num, details]) => ({
      num,
      lat: details && Number.isFinite(details.lat) ? details.lat : null,
      lon: details && Number.isFinite(details.lon) ? details.lon : null,
      zip: (details && details.zip) || null
    }))
    .sort((a, b) => naturalSort(a.num, b.num));
}

function mergeOsmAdmin(primary, secondary) {
  return {
    locality: primary?.locality || secondary?.locality || '',
    localadmin: primary?.localadmin || secondary?.localadmin || '',
    county: primary?.county || secondary?.county || '',
    borough: primary?.borough || secondary?.borough || '',
    neighbourhood: primary?.neighbourhood || secondary?.neighbourhood || '',
    region: primary?.region || secondary?.region || '',
    country: primary?.country || secondary?.country || ''
  };
}

/**
 * Flush buffer to LevelDB with merge.
 * Uses a single getMany() for all keys and a single batch write.
 *
 * NOTE: this function performs read-merge-write and therefore MUST NOT
 * run concurrently with another flush on the same database. The caller
 * serializes invocations via a promise chain.
 */
async function flushBufferToLevelDB(db, buffer, totalStreetCount) {
  if (buffer.size === 0) return 0;

  let flushedCount = 0;

  try {
    const keys = Array.from(buffer.keys());
    const existingValues = await db.getMany(keys);
    const batch = db.batch();

    keys.forEach((streetKey, i) => {
      try {
        const bufferAggregate = buffer.get(streetKey);
        const existingAggregate = existingValues[i];

        let finalAggregate;

        if (existingAggregate) {
          // Merge numbers: existing LevelDB entries first, buffer entries fill gaps
          const mergedNums = new Map();
          for (const item of existingAggregate.numbers) {
            addStoredNumberToMap(mergedNums, item);
          }
          for (const [num, details] of bufferAggregate.numbers.entries()) {
            if (!mergedNums.has(num)) {
              mergedNums.set(num, details);
            }
          }

          finalAggregate = {
            numbers: numbersMapToArray(mergedNums),
            centroid: {
              lat: existingAggregate.centroid.lat + bufferAggregate.centroid.lat,
              lon: existingAggregate.centroid.lon + bufferAggregate.centroid.lon,
              count: existingAggregate.centroid.count + bufferAggregate.centroid.count
            },
            streetName: existingAggregate.streetName || bufferAggregate.streetName,
            zip: existingAggregate.zip || bufferAggregate.zip || '',
            osmAdmin: mergeOsmAdmin(existingAggregate.osmAdmin, bufferAggregate.osmAdmin)
          };
        } else {
          // New street
          finalAggregate = {
            numbers: numbersMapToArray(bufferAggregate.numbers),
            centroid: bufferAggregate.centroid,
            streetName: bufferAggregate.streetName,
            zip: bufferAggregate.zip || '',
            osmAdmin: mergeOsmAdmin(bufferAggregate.osmAdmin, null)
          };
        }

        batch.put(streetKey, finalAggregate);
        flushedCount++;
      } catch (err) {
        peliasLogger.error('[house_numbers_collector_v2] Error processing street "%s": %s', streetKey, err.message);
      }
    });

    await batch.write();

    peliasLogger.info(
      '[house_numbers_collector_v2] Flushed batch: %d streets (total unique: ~%d)',
      flushedCount,
      totalStreetCount
    );

  } catch (err) {
    peliasLogger.error('[house_numbers_collector_v2] Batch flush error:', err);
  }

  return flushedCount;
}

module.exports = function() {
  let enabled = ENABLE_AGGREGATION;

  if (!enabled) {
    peliasLogger.info('[house_numbers_collector_v2] Aggregation disabled');
    const emptyStream = through.obj();
    emptyStream.events = new EventEmitter();
    return emptyStream;
  }

  // Open LevelDB
  const db = new Level(DB_PATH, { valueEncoding: 'json' });
  let dbOpened = false;

  // Statistics
  let docCount = 0;
  let batchNumber = 0;
  let totalStreetCount = 0;

  // In-memory buffer for current batch
  const buffer = new Map();

  // Flush serialization: read-merge-write cycles must never overlap,
  // otherwise concurrent flushes race on shared street keys (lost updates).
  // The chain guarantees ordering; the counter lets the final flush wait
  // until every queued flush has truly completed its I/O.
  let flushChain = Promise.resolve();
  let pendingFlushes = 0;

  // EventEmitter to signal when truly closed
  const collectorEvents = new EventEmitter();

  // Helper to ensure DB is opened once
  const ensureDbOpen = async () => {
    if (!dbOpened) {
      await db.open();
      dbOpened = true;
      peliasLogger.info('[house_numbers_collector_v2] LevelDB opened at %s', DB_PATH);
    }
  };

  const stream = through.obj(
    // Transform function - collect to buffer
    function(doc, enc, next) {
      try {
        const layer = doc.getLayer();
        // Process address documents (with house number) AND highway street documents (layer='street')
        const isAddress = layer === 'address';
        const isHighwayStreet = layer === 'street';

        if (isAddress || isHighwayStreet) {
          const houseNumber = isAddress ? doc.getAddress('number') : null;

          // For address docs, require a house number; for street docs, no house number needed
          if (isAddress && !houseNumber) {
            return next();
          }

          const streetKey = generateStreetKey(doc);
          docCount++;

          // Get or create aggregate in buffer
          let aggregate = buffer.get(streetKey);
          if (!aggregate) {
            // New street in buffer
            const initialZip = doc.getAddress('zip') || '';
            aggregate = {
              numbers: new Map(),  // Map<string, {lat, lon, zip}|null> - per-address coordinates & zip
              centroid: { lat: 0, lon: 0, count: 0 },
              streetName: doc.getAddress('street') || '',
              zip: initialZip,  // Street-level postal code (first wins, kept as fallback)
              // Store FULL hierarchy from WOF (doc.parent)
              osmAdmin: {
                locality: doc.parent?.locality?.[0] || '',
                localadmin: doc.parent?.localadmin?.[0] || '',
                county: doc.parent?.county?.[0] || '',
                borough: doc.parent?.borough?.[0] || '',
                neighbourhood: doc.parent?.neighbourhood?.[0] || '',
                region: doc.parent?.region?.[0] || '',
                country: doc.parent?.country?.[0] || ''  // From WOF, e.g., "United Kingdom"
              }
            };
            buffer.set(streetKey, aggregate);
            totalStreetCount++;
          }

          // Add house number with individual coordinates & zip (first occurrence wins)
          // For highway street docs there is no house number - only centroid is recorded
          const centroid = doc.getCentroid();
          const hasCoords = !!centroid && Number.isFinite(centroid.lat) && Number.isFinite(centroid.lon);

          if (houseNumber) {
            const numStr = String(houseNumber).trim();
            if (!aggregate.numbers.has(numStr)) {
              aggregate.numbers.set(numStr, {
                lat: hasCoords ? centroid.lat : null,
                lon: hasCoords ? centroid.lon : null,
                zip: doc.getAddress('zip') || null
              });
            }
          }

          // Accumulate coordinates for street centroid (addresses and highway docs alike)
          if (hasCoords) {
            aggregate.centroid.lat += centroid.lat;
            aggregate.centroid.lon += centroid.lon;
            aggregate.centroid.count++;
          }

          // Update streetName if not set
          if (!aggregate.streetName && doc.getAddress('street')) {
            aggregate.streetName = doc.getAddress('street');
          }

          // Update zip if not set
          if (!aggregate.zip && doc.getAddress('zip')) {
            aggregate.zip = doc.getAddress('zip');
          }

          // Fill in osmAdmin from WOF hierarchy if not yet populated
          if (doc.parent) {
            const osmAdmin = aggregate.osmAdmin;
            if (!osmAdmin.locality) osmAdmin.locality = doc.parent?.locality?.[0] || '';
            if (!osmAdmin.localadmin) osmAdmin.localadmin = doc.parent?.localadmin?.[0] || '';
            if (!osmAdmin.county) osmAdmin.county = doc.parent?.county?.[0] || '';
            if (!osmAdmin.borough) osmAdmin.borough = doc.parent?.borough?.[0] || '';
            if (!osmAdmin.neighbourhood) osmAdmin.neighbourhood = doc.parent?.neighbourhood?.[0] || '';
            if (!osmAdmin.region) osmAdmin.region = doc.parent?.region?.[0] || '';
            if (!osmAdmin.country) osmAdmin.country = doc.parent?.country?.[0] || '';
          }

          // Periodic batch write - queued on the serialized flush chain.
          // Does not block the pipeline (next() is called immediately below).
          if (docCount % BATCH_SIZE === 0) {
            batchNumber++;
            peliasLogger.info(
              '[house_numbers_collector_v2] Processing batch #%d (%d docs, %d streets in buffer)',
              batchNumber,
              docCount,
              buffer.size
            );

            // Create a copy of current buffer for flushing
            const bufferToFlush = new Map(buffer);
            buffer.clear();

            // Increment counter BEFORE queueing async operation
            pendingFlushes++;

            // Serialize on the chain: at most one flush runs at a time.
            flushChain = flushChain.then(async () => {
              try {
                await ensureDbOpen();
                await flushBufferToLevelDB(db, bufferToFlush, totalStreetCount);
              } catch (err) {
                peliasLogger.error('[house_numbers_collector_v2] Flush error:', err);
              } finally {
                // Decrement counter when operation truly completes
                pendingFlushes--;
              }
            });
          }
        }

        // Don't push downstream - we're just collecting
        next();

      } catch (err) {
        peliasLogger.error('[house_numbers_collector_v2] Error:', err);
        next();
      }
    },

    // Flush function - final batch write
    function(done) {
      if (!enabled) {
        return done();
      }

      peliasLogger.info('[house_numbers_collector_v2] Final flush: %d addresses, %d streets in buffer', docCount, buffer.size);

      (async () => {
        try {
          // Wait for the serialized flush chain to drain
          await flushChain;

          // Defensive: poll the counter as well (covers any flush that was
          // queued but whose finally-block has not yet run)
          if (pendingFlushes > 0) {
            peliasLogger.info('[house_numbers_collector_v2] Waiting for %d pending flushes to complete...', pendingFlushes);
            while (pendingFlushes > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          peliasLogger.info('[house_numbers_collector_v2] All pending flushes completed');

          // Flush remaining buffer if not empty
          if (buffer.size > 0) {
            peliasLogger.info('[house_numbers_collector_v2] Flushing remaining buffer: %d streets', buffer.size);
            await ensureDbOpen();
            await flushBufferToLevelDB(db, buffer, totalStreetCount);
          }

          // Close database
          if (dbOpened) {
            peliasLogger.info('[house_numbers_collector_v2] Closing database...');
            await db.close();
            peliasLogger.info('[house_numbers_collector_v2] Database closed, waiting for file lock release...');

            // Wait additional time for LevelDB to fully release file locks
            // This prevents LEVEL_LOCKED errors in Pass 2
            await new Promise(resolve => setTimeout(resolve, 3000));
            peliasLogger.info('[house_numbers_collector_v2] File lock release wait complete');
          }

          peliasLogger.info('[house_numbers_collector_v2] Collection complete: %d addresses processed', docCount);

          // Signal completion via EventEmitter
          collectorEvents.emit('closed');

          // Call done() to complete the stream
          done();
        } catch (err) {
          peliasLogger.error('[house_numbers_collector_v2] Final flush error:', err);
          collectorEvents.emit('error', err);
          done(err);
        }
      })();
    }
  );

  // Attach EventEmitter to stream for external synchronization
  stream.events = collectorEvents;

  return stream;
};
