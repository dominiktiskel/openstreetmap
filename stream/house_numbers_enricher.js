/**
  House Numbers Enricher (Pass 2 of streaming aggregation)
  
  This stream processor reads aggregated house numbers from LevelDB (collected in Pass 1)
  and adds them to address documents as addendum data.
  
  Pass 1: (collector) Collect → LevelDB
  Pass 2: Read from LevelDB → Add addendum
  
  @see: house_numbers_collector.js for Pass 1
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
 * Generate a unique key for a street based on geographic coordinates.
 * Same function as in collector for consistency.
 * Format: "street|lat|lon"
 * 
 * MUST generate identical keys as collector to successfully retrieve aggregated data.
 * Uses coordinates rounded to 1 decimal place (~11km precision) to ensure proper
 * geographic separation of streets in different locations.
 * 
 * Locality is NOT used because:
 * - It's often missing from OSM (addr:city tag)
 * - WOF lookup happens only in Pass 2 (not available in collector)
 * - Geographic coordinates alone provide reliable separation
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';
  
  // Get centroid and round to 1 decimal place (~11km precision)
  const centroid = doc.getCentroid();
  const lat = centroid && centroid.lat ? centroid.lat.toFixed(1) : '0.0';
  const lon = centroid && centroid.lon ? centroid.lon.toFixed(1) : '0.0';
  
  // Key format: street|lat|lon
  // All components lowercased for consistent matching
  return [street, lat, lon]
    .map(s => String(s).trim().toLowerCase())
    .join('|');
}

module.exports = function() {
  let db;
  let enrichedCount = 0;
  let missedCount = 0;
  let enabled = ENABLE_AGGREGATION;
  let dbExists = false;

  return through.obj(
    // Transform function - enrich from LevelDB
    function(doc, enc, next) {
      // If aggregation is disabled, just pass through
      if (!enabled) {
        return next(null, doc);
      }

      try {
        // Initialize DB on first document
        if (!db) {
          // Check if database exists
          if (!fs.existsSync(DB_PATH)) {
            peliasLogger.warn(
              '[house_numbers_enricher] LevelDB not found at %s - skipping enrichment',
              DB_PATH
            );
            enabled = false; // Disable for this run
            return next(null, doc);
          }

          db = new Level(DB_PATH, { valueEncoding: 'json' });
          dbExists = true;
          peliasLogger.info('[house_numbers_enricher] Pass 2: Enrichment phase started');
          peliasLogger.info('[house_numbers_enricher] Reading from: %s', DB_PATH);
        }

        // Only process address documents
        if (doc.getLayer() === 'address') {
          const streetKey = generateStreetKey(doc);
          
          // Read from LevelDB
          db.get(streetKey, (err, value) => {
            if (err) {
              if (!err.notFound) {
                peliasLogger.error('[house_numbers_enricher] LevelDB read error:', err);
              }
              missedCount++;
            } else if (value) {
              // Handle both old array format (v1.5.x) and new object format (v1.6.0+)
              const numbers = Array.isArray(value) ? value : value.numbers;
              
              if (numbers && numbers.length > 0) {
                // Add addendum
                const existingAddendum = doc.getAddendum('osm') || {};
                existingAddendum.house_numbers = numbers.join(',');
                doc.setAddendum('osm', existingAddendum);
                enrichedCount++;

                // Log progress every 10K documents
                if (enrichedCount % 10000 === 0) {
                  peliasLogger.info(
                    '[house_numbers_enricher] Enriched %d addresses (%d not found)',
                    enrichedCount,
                    missedCount
                  );
                }
              }
            }
            
            // Push document downstream
            this.push(doc);
          });
        } else {
          // Non-address documents pass through immediately
          this.push(doc);
        }
      } catch (e) {
        peliasLogger.error('[house_numbers_enricher] Error during enrichment');
        peliasLogger.error(e.stack);
        this.push(doc); // Still push document
      }

      return next();
    },
    
    // Flush function - close database (cleanup happens in street_generator)
    function(done) {
      if (!enabled || !dbExists) {
        return done();
      }

      peliasLogger.info(
        '[house_numbers_enricher] Pass 2 complete: %d enriched, %d not found',
        enrichedCount,
        missedCount
      );

      if (db) {
        db.close((err) => {
          if (err) {
            peliasLogger.error('[house_numbers_enricher] Error closing database:', err);
          } else {
            peliasLogger.info('[house_numbers_enricher] Database closed (will be cleaned up by street_generator)');
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
module.exports.DB_PATH = DB_PATH;

