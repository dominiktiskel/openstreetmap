/**
  Admin Hierarchy Updater
  
  Updates LevelDB aggregates with parent hierarchy from enriched addresses.
  This must run AFTER wof-admin-lookup and BEFORE street_generator.
  
  Purpose: Ensure street documents inherit locality from their addresses.
  
  Pipeline position:
  - AFTER: wof-admin-lookup (so doc.parent.locality exists)
  - BEFORE: street_generator (so it reads updated aggregates)
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
 * Generate street key (same as in collector/enricher)
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';
  const centroid = doc.getCentroid();
  const lat = centroid && centroid.lat ? centroid.lat.toFixed(2) : '0.00';
  const lon = centroid && centroid.lon ? centroid.lon.toFixed(2) : '0.00';
  
  return [street, lat, lon]
    .map(s => String(s).trim().toLowerCase())
    .join('|');
}

module.exports = function() {
  let db;
  let updatedCount = 0;
  let enabled = ENABLE_AGGREGATION;
  let dbExists = false;

  return through.obj(
    // Transform function - update LevelDB with parent hierarchy
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
            peliasLogger.warn('[admin_hierarchy_updater] LevelDB not found - skipping');
            enabled = false;
            return next(null, doc);
          }

          db = new Level(DB_PATH, { valueEncoding: 'json' });
          dbExists = true;
          peliasLogger.info('[admin_hierarchy_updater] Updating aggregates with parent hierarchy');
        }

        // Only process address documents
        if (doc.getLayer() === 'address') {
          const streetKey = generateStreetKey(doc);
          
          // Read aggregate from LevelDB
          db.get(streetKey, (err, aggregate) => {
            if (err || !aggregate || Array.isArray(aggregate)) {
              // Not found or old format - just pass through
              this.push(doc);
              return;
            }
            
            if (!aggregate.osmAdmin) {
              // Old aggregate format - just pass through
              this.push(doc);
              return;
            }
            
            let needsUpdate = false;
            
            // Update locality if aggregate doesn't have it yet
            if (!aggregate.osmAdmin.locality || aggregate.osmAdmin.locality.trim() === '') {
              const parentLocality = doc.parent && doc.parent.locality && doc.parent.locality[0];
              if (parentLocality && parentLocality.trim()) {
                aggregate.osmAdmin.locality = parentLocality;
                needsUpdate = true;
              }
            }
            
            // Update region if aggregate doesn't have it yet
            if (!aggregate.osmAdmin.region || aggregate.osmAdmin.region.trim() === '') {
              const parentRegion = doc.parent && doc.parent.region && doc.parent.region[0];
              if (parentRegion && parentRegion.trim()) {
                aggregate.osmAdmin.region = parentRegion;
                needsUpdate = true;
              }
            }
            
            // Update country if aggregate doesn't have it yet
            if (!aggregate.osmAdmin.country || aggregate.osmAdmin.country.trim() === '') {
              const parentCountry = doc.parent && doc.parent.country && doc.parent.country[0];
              if (parentCountry && parentCountry.trim()) {
                aggregate.osmAdmin.country = parentCountry;
                needsUpdate = true;
              }
            }
            
            // Write back to LevelDB if updated
            if (needsUpdate) {
              db.put(streetKey, aggregate, (putErr) => {
                if (putErr) {
                  peliasLogger.error('[admin_hierarchy_updater] Failed to update:', putErr);
                } else {
                  updatedCount++;
                  
                  // Log first 5 updates
                  if (updatedCount <= 5) {
                    peliasLogger.debug(
                      '[admin_hierarchy_updater] Updated "%s" with locality="%s"',
                      aggregate.streetName,
                      aggregate.osmAdmin.locality
                    );
                  }
                  
                  // Log progress every 100 updates
                  if (updatedCount % 100 === 0) {
                    peliasLogger.info('[admin_hierarchy_updater] Updated %d aggregates', updatedCount);
                  }
                }
              });
            }
            
            // Push document downstream
            this.push(doc);
          });
        } else {
          // Non-address documents pass through immediately
          this.push(doc);
        }
      } catch (e) {
        peliasLogger.error('[admin_hierarchy_updater] Error:', e);
        this.push(doc);
      }

      return next();
    },
    
    // Flush function
    function(done) {
      if (!enabled || !dbExists) {
        return done();
      }

      peliasLogger.info('[admin_hierarchy_updater] Updated %d aggregates with parent hierarchy', updatedCount);

      if (db) {
        db.close((err) => {
          if (err) {
            peliasLogger.error('[admin_hierarchy_updater] Error closing database:', err);
          }
          done();
        });
      } else {
        done();
      }
    }
  );
};

module.exports.generateStreetKey = generateStreetKey;

