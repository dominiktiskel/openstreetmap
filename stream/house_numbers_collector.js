/**
  House Numbers Collector (Pass 1 of streaming aggregation)
  
  This stream processor collects house numbers from address documents and stores
  them in LevelDB for later enrichment. Uses periodic batch writes to balance
  performance and memory usage.
  
  Strategy:
  - Collect addresses in memory buffer (Map of street → aggregates)
  - Flush to LevelDB every BATCH_SIZE addresses (default: 10,000)
  - Merge with existing LevelDB data on each flush
  - Final flush at end of stream
  
  Pass 1: Collect in buffer → Periodic batch write → Merge → LevelDB
  Pass 2: (enricher) Read from LevelDB → Add addendum
  
  Street Key Format (v1.7.2):
  - "street|lat|lon" (e.g., "aleja akacjowa|51.1|17.0")
  - Locality NOT included (often missing from OSM, causes split groups)
  - Coordinates rounded to 0.1° (~11km) for reliable geographic grouping
  
  Memory usage: ~5-10 MB per batch (BATCH_SIZE addresses across ~1-5K streets).
  This scales to unlimited addresses while avoiding race conditions.
  
  @see: house_numbers_enricher.js for Pass 2
**/

const through = require('through2');
const { Level } = require('level');
const path = require('path');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();
const _ = require('lodash');
const fs = require('fs');

// Configuration
const LEVELDB_PATH_BASE = _.get(peliasConfig, 'imports.openstreetmap.leveldbpath', require('os').tmpdir());
const ENABLE_AGGREGATION = _.get(peliasConfig, 'imports.openstreetmap.aggregateHouseNumbers', true);
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-house-numbers-aggregation');

// Batch write every N addresses to limit memory usage
// For ~30M addresses in Poland with ~100K streets, this results in ~300 batch writes
// Memory usage: buffer holds max ~10K addresses across potentially 1-5K streets = ~5-10 MB
const BATCH_SIZE = 10000;

/**
 * Generate a unique key for a street based on geographic coordinates.
 * Format: "street|lat|lon"
 * 
 * Uses coordinates rounded to 1 decimal place (~11km precision) to ensure proper
 * geographic separation of streets in different locations.
 * 
 * Locality is NOT used because:
 * - It's often missing from OSM (addr:city tag)
 * - WOF lookup happens only in Pass 2 (not available here)
 * - Geographic coordinates alone provide reliable separation
 * 
 * This ensures all addresses on the same street in the same area are grouped together,
 * regardless of whether they have addr:city tag or not.
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';
  
  // Get centroid and round to 2 decimal places (~1.1km precision)
  const centroid = doc.getCentroid();
  const lat = centroid && centroid.lat ? centroid.lat.toFixed(2) : '0.00';
  const lon = centroid && centroid.lon ? centroid.lon.toFixed(2) : '0.00';
  
  // Key format: street|lat|lon
  // All components lowercased for consistent matching
  return [street, lat, lon]
    .map(s => String(s).trim().toLowerCase())
    .join('|');
}

/**
 * Natural sort comparison function for house numbers.
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
 * Writes buffer to LevelDB, merging with existing data.
 * Returns a promise that resolves when write is complete.
 */
async function flushBufferToLevelDB(db, buffer, totalStreetCount) {
  if (buffer.size === 0) {
    return 0;
  }

  const batch = db.batch();
  let writeCount = 0;

  for (const [streetKey, bufferAggregate] of buffer.entries()) {
    try {
      // Try to read existing data from LevelDB
      let existingAggregate = null;
      try {
        existingAggregate = await db.get(streetKey);
      } catch (err) {
        if (!err.notFound) {
          throw err; // Unexpected error
        }
        // Key not found - this is fine, it's a new street
      }

      let finalAggregate;
      if (existingAggregate) {
        // Merge with existing data
        const existingNumbers = new Set(existingAggregate.numbers || []);
        const bufferNumbers = bufferAggregate.numbers;
        
        // Merge number sets
        for (const num of bufferNumbers) {
          existingNumbers.add(num);
        }
        
        finalAggregate = {
          numbers: Array.from(existingNumbers).sort(naturalSort),
          centroid: {
            lat: existingAggregate.centroid.lat + bufferAggregate.centroid.lat,
            lon: existingAggregate.centroid.lon + bufferAggregate.centroid.lon,
            count: existingAggregate.centroid.count + bufferAggregate.centroid.count
          },
          streetName: existingAggregate.streetName || bufferAggregate.streetName,
          osmAdmin: {
            locality: existingAggregate.osmAdmin?.locality || bufferAggregate.osmAdmin?.locality || '',
            localadmin: existingAggregate.osmAdmin?.localadmin || bufferAggregate.osmAdmin?.localadmin || '',
            county: existingAggregate.osmAdmin?.county || bufferAggregate.osmAdmin?.county || '',
            borough: existingAggregate.osmAdmin?.borough || bufferAggregate.osmAdmin?.borough || '',
            neighbourhood: existingAggregate.osmAdmin?.neighbourhood || bufferAggregate.osmAdmin?.neighbourhood || '',
            region: existingAggregate.osmAdmin?.region || bufferAggregate.osmAdmin?.region || '',
            country: existingAggregate.osmAdmin?.country || bufferAggregate.osmAdmin?.country || ''
          }
        };
      } else {
        // New street - convert Set to sorted array
        finalAggregate = {
          numbers: Array.from(bufferAggregate.numbers).sort(naturalSort),
          centroid: bufferAggregate.centroid,
          streetName: bufferAggregate.streetName,
          osmAdmin: {
            locality: bufferAggregate.osmAdmin?.locality || '',
            localadmin: bufferAggregate.osmAdmin?.localadmin || '',
            county: bufferAggregate.osmAdmin?.county || '',
            borough: bufferAggregate.osmAdmin?.borough || '',
            neighbourhood: bufferAggregate.osmAdmin?.neighbourhood || '',
            region: bufferAggregate.osmAdmin?.region || '',
            country: bufferAggregate.osmAdmin?.country || ''
          }
        };
      }

      batch.put(streetKey, finalAggregate);
      writeCount++;
    } catch (err) {
      peliasLogger.error('[house_numbers_collector] Error processing street "%s":', streetKey, err);
      // Continue with other streets
    }
  }

  // Commit batch
  await batch.write();
  peliasLogger.info(
    '[house_numbers_collector] Flushed %d streets to LevelDB (total: ~%d)',
    writeCount,
    totalStreetCount
  );

  return writeCount;
}

module.exports = function() {
  let db;
  let docCount = 0;
  let totalStreetCount = 0;
  let batchWriteCount = 0;
  let enabled = ENABLE_AGGREGATION;
  
  // In-memory buffer for periodic batch writes
  const buffer = new Map();

  return through.obj(
    // Transform function - collect to buffer and flush periodically
    function(doc, enc, next) {
      // If aggregation is disabled, just pass through
      if (!enabled) {
        return next(null, doc);
      }

      try {
        // Initialize DB on first document
        if (!db) {
          // Clean up old DB if exists
          if (fs.existsSync(DB_PATH)) {
            fs.rmSync(DB_PATH, { recursive: true, force: true });
            peliasLogger.debug('[house_numbers_collector] Cleaned old database');
          }
          
          db = new Level(DB_PATH, { valueEncoding: 'json' });
          peliasLogger.info('[house_numbers_collector] Pass 1: Collection phase started');
          peliasLogger.info('[house_numbers_collector] Database: %s', DB_PATH);
          peliasLogger.info('[house_numbers_collector] Batch size: %d addresses', BATCH_SIZE);
        }

        // Only process address documents
        if (doc.getLayer() === 'address') {
          const houseNumber = doc.getAddress('number');
          if (houseNumber) {
            const streetKey = generateStreetKey(doc);
            docCount++;

            // Get or create aggregate in buffer
            let aggregate = buffer.get(streetKey);
            if (!aggregate) {
              // New street in buffer - create initial structure
              aggregate = {
                numbers: new Set(), // Use Set for automatic deduplication
                centroid: { lat: 0, lon: 0, count: 0 },
                streetName: doc.getAddress('street') || '',
                // OSM admin data (for prioritizing over WOF)
                // Only city/state/country available from addr:* tags in Pass 1
                // localadmin/county/borough/neighbourhood will be filled in Pass 2 by admin_hierarchy_updater
                osmAdmin: {
                  locality: doc.getAddress('city') || '',
                  localadmin: '',
                  county: '',
                  borough: '',
                  neighbourhood: '',
                  region: doc.getAddress('state') || '',
                  country: doc.getAddress('country') || ''
                }
              };
              buffer.set(streetKey, aggregate);
              totalStreetCount++; // May count duplicates across batches, but that's OK for logging
            }
            
            // Add house number (Set automatically handles duplicates)
            aggregate.numbers.add(String(houseNumber).trim());
            
            // Accumulate coordinates for centroid calculation
            const centroid = doc.getCentroid();
            if (centroid && centroid.lat && centroid.lon) {
              aggregate.centroid.lat += centroid.lat;
              aggregate.centroid.lon += centroid.lon;
              aggregate.centroid.count++;
            }
            
            // Update streetName if not set (preserve original capitalization)
            if (!aggregate.streetName && doc.getAddress('street')) {
              aggregate.streetName = doc.getAddress('street');
            }
            
            // Update OSM admin data if not set (use first available value from any address)
            if (!aggregate.osmAdmin.locality && doc.getAddress('city')) {
              aggregate.osmAdmin.locality = doc.getAddress('city');
            }
            if (!aggregate.osmAdmin.region && doc.getAddress('state')) {
              aggregate.osmAdmin.region = doc.getAddress('state');
            }
            if (!aggregate.osmAdmin.country && doc.getAddress('country')) {
              aggregate.osmAdmin.country = doc.getAddress('country');
            }

            // Periodic batch write to limit memory usage
            if (docCount % BATCH_SIZE === 0) {
              peliasLogger.info(
                '[house_numbers_collector] Processed %d addresses, flushing buffer (%d streets)...',
                docCount,
                buffer.size
              );
              
              // Flush buffer to LevelDB asynchronously
              flushBufferToLevelDB(db, buffer, totalStreetCount)
                .then(() => {
                  batchWriteCount++;
                  buffer.clear(); // Clear buffer after successful write
                })
                .catch((err) => {
                  peliasLogger.error('[house_numbers_collector] Error flushing buffer:', err);
                  // Don't clear buffer on error - will retry in next batch or flush
                });
            }
          }
        }

        // Always pass document through (non-blocking)
        this.push(doc);
      } catch (e) {
        peliasLogger.error('[house_numbers_collector] Error during collection');
        peliasLogger.error(e.stack);
        this.push(doc); // Still push document
      }

      return next();
    },
    
    // Flush function - write remaining buffer to LevelDB and close database
    async function(done) {
      if (!enabled) {
        return done();
      }

      peliasLogger.info(
        '[house_numbers_collector] Pass 1 complete: %d addresses processed, %d batch writes',
        docCount,
        batchWriteCount
      );
      
      try {
        // Flush any remaining data in buffer
        if (buffer.size > 0) {
          peliasLogger.info('[house_numbers_collector] Flushing final buffer (%d streets)...', buffer.size);
          await flushBufferToLevelDB(db, buffer, totalStreetCount);
          buffer.clear();
        }

        // Close database
        if (db) {
          await db.close();
          peliasLogger.info('[house_numbers_collector] Database closed successfully');
        }
        
        done();
      } catch (e) {
        peliasLogger.error('[house_numbers_collector] Error during flush:', e);
        buffer.clear();
        done(e);
      }
    }
  );
};

// Export for testing
module.exports.generateStreetKey = generateStreetKey;
module.exports.naturalSort = naturalSort;
module.exports.DB_PATH = DB_PATH;

