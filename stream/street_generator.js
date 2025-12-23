/**
  Street Generator (Final step of Pass 2)
  
  This stream processor generates street documents from the aggregated data in LevelDB.
  It runs in the flush phase (after all addresses have been processed) to create one
  street document per unique street (street|lat|lon combination).
  
  Each street document includes:
  - layer: 'street'
  - name: street name (original capitalization)
  - centroid: average of all address coordinates on that street
  - addendum.osm.house_numbers: comma-separated list of all house numbers
  - parent hierarchy: populated by WOF adminLookup downstream
  
  Key Format (v1.8.1):
  - "street|lat|lon" (e.g., "aleja akacjowa|51.18|17.05")
  - Coordinates rounded to 0.01° (~1.1km)
  - Locality NOT included (causes split groups when missing from OSM)
  
  @see: house_numbers_collector.js for data collection (Pass 1)
  @see: house_numbers_enricher.js for address enrichment (Pass 2)
**/

const through = require('through2');
const { Level } = require('level');
const path = require('path');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();
const _ = require('lodash');
const fs = require('fs');
const Document = require('pelias-model').Document;

// Configuration
const LEVELDB_PATH_BASE = _.get(peliasConfig, 'imports.openstreetmap.leveldbpath', require('os').tmpdir());
const ENABLE_AGGREGATION = _.get(peliasConfig, 'imports.openstreetmap.aggregateHouseNumbers', true);
const IMPORT_STREETS = _.get(peliasConfig, 'imports.openstreetmap.importStreets', true);
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-house-numbers-aggregation');

module.exports = function() {
  let passedThroughCount = 0;
  let streetsGeneratedCount = 0;
  let enabled = ENABLE_AGGREGATION && IMPORT_STREETS;

  return through.obj(
    // Transform function - pass all documents through unchanged
    function(doc, enc, next) {
      passedThroughCount++;
      this.push(doc);
      next();
    },
    
    // Flush function - generate street documents from LevelDB
    function(done) {
      if (!enabled) {
        peliasLogger.info('[street_generator] Street generation disabled');
        return done();
      }

      // Check if database exists
      if (!fs.existsSync(DB_PATH)) {
        peliasLogger.warn('[street_generator] LevelDB not found at %s - skipping street generation', DB_PATH);
        return done();
      }

      peliasLogger.info('[street_generator] ========================================');
      peliasLogger.info('[street_generator] Generating street documents from LevelDB');
      peliasLogger.info('[street_generator] ========================================');

      const db = new Level(DB_PATH, { valueEncoding: 'json' });
      const self = this;

      // Use async iteration with level v8.x iterator API
      (async () => {
        try {
          // Iterate through all entries in LevelDB
          for await (const [key, value] of db.iterator()) {
            try {
              // Handle both old array format and new object format
              let aggregate;
              if (Array.isArray(value)) {
                // Old format (v1.5.x) - skip street generation as we don't have centroid data
                peliasLogger.debug('[street_generator] Skipping street (old format): %s', key);
                continue;
              } else {
                aggregate = value;
              }

              // Skip if no addresses or no centroid data
              if (!aggregate.numbers || aggregate.numbers.length === 0) {
                continue;
              }
              if (!aggregate.centroid || aggregate.centroid.count === 0) {
                peliasLogger.debug('[street_generator] Skipping street (no centroid): %s', key);
                continue;
              }

              // Get original street name with proper capitalization from aggregate
              const streetName = aggregate.streetName || key.split('|')[0];
              
              if (!streetName) {
                peliasLogger.debug('[street_generator] Skipping street (no name): %s', key);
                continue;
              }

              // Calculate average centroid
              const avgLat = aggregate.centroid.lat / aggregate.centroid.count;
              const avgLon = aggregate.centroid.lon / aggregate.centroid.count;

              // Generate unique ID for street (use lowercase key for consistency)
              const streetId = `street_${key.replace(/\|/g, '_')}`;

              // Create street document with original capitalized street name
              const streetDoc = new Document('openstreetmap', 'street', streetId)
                .setName('default', streetName)
                .setCentroid({ lat: avgLat, lon: avgLon });

              // Add house numbers to addendum
              streetDoc.setAddendum('osm', {
                house_numbers: aggregate.numbers.join(',')
              });

              // Parent hierarchy will be added by adminLookup() downstream
              // when street documents pass through the WOF lookup pipeline.
              // This ensures full hierarchy (locality, region, county, country, localadmin)
              // is populated correctly for all street documents.

              // Push street document to pipeline
              self.push(streetDoc);
              streetsGeneratedCount++;

              // Log progress every 1000 streets
              if (streetsGeneratedCount % 1000 === 0) {
                peliasLogger.info('[street_generator] Generated %d streets', streetsGeneratedCount);
              }
            } catch (e) {
              peliasLogger.error('[street_generator] Error generating street for key: %s', key);
              peliasLogger.error(e.stack);
            }
          }

          peliasLogger.info('[street_generator] ========================================');
          peliasLogger.info('[street_generator] Generated %d street documents', streetsGeneratedCount);
          peliasLogger.info('[street_generator] Passed through %d documents', passedThroughCount);
          peliasLogger.info('[street_generator] ========================================');

          // Close and cleanup database
          await db.close();
          peliasLogger.info('[street_generator] Database closed successfully');

          // Cleanup LevelDB
          if (fs.existsSync(DB_PATH)) {
            try {
              fs.rmSync(DB_PATH, { recursive: true, force: true });
              peliasLogger.info('[street_generator] Cleaned up LevelDB successfully');
            } catch (cleanupErr) {
              peliasLogger.warn('[street_generator] Could not cleanup LevelDB:', cleanupErr.message);
              peliasLogger.warn('[street_generator] Manual cleanup may be needed: %s', DB_PATH);
            }
          }

          done();
        } catch (err) {
          peliasLogger.error('[street_generator] Error reading from LevelDB:', err);
          try {
            await db.close();
          } catch (closeErr) {
            peliasLogger.error('[street_generator] Error closing database:', closeErr);
          }
          done(err);
        }
      })();
    }
  );
};

// Export for testing
module.exports.DB_PATH = DB_PATH;

