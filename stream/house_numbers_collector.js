/**
  House Numbers Collector (Pass 1 of streaming aggregation)
  
  This stream processor collects house numbers from address documents and stores
  them in LevelDB for later enrichment. Uses streaming to handle unlimited addresses
  without memory issues.
  
  Pass 1: Collect → LevelDB
  Pass 2: (enricher) Read from LevelDB → Add addendum
  
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

/**
 * Generate a unique key for a street based on its full administrative hierarchy.
 * Format: "street|locality|region|country"
 * 
 * NOTE: In Pass 1, parent hierarchy is not yet populated (added by WOF lookup in Pass 2).
 * So we read directly from OSM tags (addr:city, addr:state, addr:country) which are
 * available immediately from the raw OSM data.
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';
  
  // Try to get admin data from OSM tags first (available in Pass 1)
  const tags = doc.getMeta('tags') || {};
  const locality = tags['addr:city'] || _.get(doc, 'parent.locality[0]', '');
  const region = tags['addr:state'] || _.get(doc, 'parent.region[0]', '');
  const country = tags['addr:country'] || _.get(doc, 'parent.country[0]', '');
  
  return [street, locality, region, country]
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

module.exports = function() {
  let db;
  let docCount = 0;
  let streetCount = 0;
  let enabled = ENABLE_AGGREGATION;

  return through.obj(
    // Transform function - collect to LevelDB
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
        }

        // Only process address documents
        if (doc.getLayer() === 'address') {
          const houseNumber = doc.getAddress('number');
          if (houseNumber) {
            const streetKey = generateStreetKey(doc);
            docCount++;

            // Read existing data, update, write back
            db.get(streetKey, (err, data) => {
              // Initialize aggregate structure
              let aggregate;
              
              if (err && err.notFound) {
                // New street - create initial structure
                const tags = doc.getMeta('tags') || {};
                aggregate = {
                  numbers: [],
                  centroid: { lat: 0, lon: 0, count: 0 },
                  locality: tags['addr:city'] || '',
                  region: tags['addr:state'] || '',
                  country: tags['addr:country'] || ''
                };
                streetCount++;
              } else if (err) {
                // Unexpected error
                peliasLogger.error('[house_numbers_collector] LevelDB error:', err);
                return;
              } else {
                // Existing street - handle both old array format and new object format
                if (Array.isArray(data)) {
                  // Migrate from old format (v1.5.x) to new format
                  const tags = doc.getMeta('tags') || {};
                  aggregate = {
                    numbers: data,
                    centroid: { lat: 0, lon: 0, count: 0 },
                    locality: tags['addr:city'] || '',
                    region: tags['addr:state'] || '',
                    country: tags['addr:country'] || ''
                  };
                } else {
                  aggregate = data;
                }
              }
              
              // Add new house number
              const numbersSet = new Set(aggregate.numbers);
              numbersSet.add(String(houseNumber).trim());
              aggregate.numbers = Array.from(numbersSet).sort(naturalSort);
              
              // Accumulate coordinates for centroid calculation
              const centroid = doc.getCentroid();
              if (centroid && centroid.lat && centroid.lon) {
                aggregate.centroid.lat += centroid.lat;
                aggregate.centroid.lon += centroid.lon;
                aggregate.centroid.count++;
              }
              
              // Update admin data if available (keep first non-empty value)
              const tags = doc.getMeta('tags') || {};
              if (!aggregate.locality && tags['addr:city']) {
                aggregate.locality = tags['addr:city'];
              }
              if (!aggregate.region && tags['addr:state']) {
                aggregate.region = tags['addr:state'];
              }
              if (!aggregate.country && tags['addr:country']) {
                aggregate.country = tags['addr:country'];
              }
              
              // Save to database
              db.put(streetKey, aggregate, (putErr) => {
                if (putErr) {
                  peliasLogger.error('[house_numbers_collector] Error writing to LevelDB:', putErr);
                }
              });
            });

            // Log progress every 10K documents
            if (docCount % 10000 === 0) {
              peliasLogger.info(
                '[house_numbers_collector] Processed %d addresses across %d streets',
                docCount,
                streetCount
              );
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
    
    // Flush function - close database
    function(done) {
      if (!enabled) {
        return done();
      }

      if (db) {
        peliasLogger.info(
          '[house_numbers_collector] Pass 1 complete: %d addresses, %d unique streets',
          docCount,
          streetCount
        );
        
        db.close((err) => {
          if (err) {
            peliasLogger.error('[house_numbers_collector] Error closing database:', err);
          } else {
            peliasLogger.info('[house_numbers_collector] Database closed successfully');
          }
          done();
        });
      } else {
        done();
      }
    }
  );
};

// Export for testing
module.exports.generateStreetKey = generateStreetKey;
module.exports.naturalSort = naturalSort;
module.exports.DB_PATH = DB_PATH;

