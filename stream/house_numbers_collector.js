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
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';
  const locality = _.get(doc, 'parent.locality[0]', '');
  const region = _.get(doc, 'parent.region[0]', '');
  const country = _.get(doc, 'parent.country[0]', '');
  
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

            // Read existing numbers, add new one, write back
            db.get(streetKey, (err, numbers) => {
              let numbersSet;
              
              if (err && err.notFound) {
                // New street
                numbersSet = new Set();
                streetCount++;
              } else if (err) {
                // Unexpected error
                peliasLogger.error('[house_numbers_collector] LevelDB error:', err);
                return;
              } else {
                // Existing street
                numbersSet = new Set(numbers);
              }
              
              // Add new number
              numbersSet.add(String(houseNumber).trim());
              
              // Sort and save
              const sortedNumbers = Array.from(numbersSet).sort(naturalSort);
              
              db.put(streetKey, sortedNumbers, (putErr) => {
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

