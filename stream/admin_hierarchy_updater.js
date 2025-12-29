/**
  Admin Hierarchy Updater
  
  Collects parent hierarchy from enriched addresses in transform phase,
  then updates LevelDB aggregates in flush phase (after enricher closes DB).
  
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
  let enabled = ENABLE_AGGREGATION;
  let addressCount = 0;
  
  // Collect parent hierarchy in transform phase (Map: streetKey -> parent data)
  const parentHierarchyMap = new Map();

  return through.obj(
    // Transform function - collect parent hierarchy from addresses
    function(doc, enc, next) {
      // If aggregation is disabled, just pass through
      if (!enabled) {
        this.push(doc);
        return next();
      }

      try {
        // Only process address documents
        if (doc.getLayer() === 'address') {
          addressCount++;
          
          const streetKey = generateStreetKey(doc);
          const parentLocality = doc.parent && doc.parent.locality && doc.parent.locality[0];
          const parentRegion = doc.parent && doc.parent.region && doc.parent.region[0];
          const parentCountry = doc.parent && doc.parent.country && doc.parent.country[0];
          
          // Debug: Log first 3 addresses
          if (addressCount <= 3) {
            peliasLogger.info(
              '[admin_hierarchy_updater] Address #%d: street="%s", parent.locality=%j',
              addressCount,
              doc.getAddress('street'),
              doc.parent && doc.parent.locality
            );
          }
          
          // Collect parent hierarchy for this street
          if (parentLocality || parentRegion || parentCountry) {
            if (!parentHierarchyMap.has(streetKey)) {
              parentHierarchyMap.set(streetKey, {
                locality: parentLocality || '',
                region: parentRegion || '',
                country: parentCountry || ''
              });
            }
          }
        }
        
        // Pass through all documents
        this.push(doc);
        next();
      } catch (e) {
        peliasLogger.error('[admin_hierarchy_updater] Error:', e);
        this.push(doc);
        next();
      }
    },
    
    // Flush function - update LevelDB with collected parent hierarchy
    function(done) {
      if (!enabled) {
        return done();
      }

      if (parentHierarchyMap.size === 0) {
        peliasLogger.info('[admin_hierarchy_updater] No parent hierarchy collected, skipping');
        return done();
      }

      // Check if database exists
      if (!fs.existsSync(DB_PATH)) {
        peliasLogger.warn('[admin_hierarchy_updater] LevelDB not found - skipping');
        return done();
      }

      peliasLogger.info('[admin_hierarchy_updater] Updating %d aggregates with parent hierarchy...', parentHierarchyMap.size);

      // Open LevelDB (enricher has closed it by now)
      const db = new Level(DB_PATH, { valueEncoding: 'json' });
      
      let checked = 0;
      let updated = 0;
      let alreadyHasLocality = 0;
      let notFound = 0;

      // Update all aggregates
      (async () => {
        try {
          for (const [streetKey, parentHierarchy] of parentHierarchyMap) {
            try {
              // Read aggregate from LevelDB
              const aggregate = await db.get(streetKey);
              
              if (!aggregate || Array.isArray(aggregate) || !aggregate.osmAdmin) {
                notFound++;
                continue;
              }
              
              checked++;
              let needsUpdate = false;
              
              // Debug: Log first 3 aggregates
              if (checked <= 3) {
                peliasLogger.info(
                  '[admin_hierarchy_updater] Aggregate #%d: street="%s", existing locality="%s", new locality="%s"',
                  checked,
                  aggregate.streetName,
                  aggregate.osmAdmin.locality || '(empty)',
                  parentHierarchy.locality
                );
              }
              
              // Update locality if aggregate doesn't have it
              if (!aggregate.osmAdmin.locality || aggregate.osmAdmin.locality.trim() === '') {
                if (parentHierarchy.locality && parentHierarchy.locality.trim()) {
                  aggregate.osmAdmin.locality = parentHierarchy.locality;
                  needsUpdate = true;
                }
              } else {
                alreadyHasLocality++;
              }
              
              // Update region if aggregate doesn't have it
              if (!aggregate.osmAdmin.region || aggregate.osmAdmin.region.trim() === '') {
                if (parentHierarchy.region && parentHierarchy.region.trim()) {
                  aggregate.osmAdmin.region = parentHierarchy.region;
                  needsUpdate = true;
                }
              }
              
              // Update country if aggregate doesn't have it
              if (!aggregate.osmAdmin.country || aggregate.osmAdmin.country.trim() === '') {
                if (parentHierarchy.country && parentHierarchy.country.trim()) {
                  aggregate.osmAdmin.country = parentHierarchy.country;
                  needsUpdate = true;
                }
              }
              
              // Write back to LevelDB if updated
              if (needsUpdate) {
                await db.put(streetKey, aggregate);
                updated++;
                
                // Log first 5 updates
                if (updated <= 5) {
                  peliasLogger.info(
                    '[admin_hierarchy_updater] Updated "%s" with locality="%s"',
                    aggregate.streetName,
                    aggregate.osmAdmin.locality
                  );
                }
              }
            } catch (err) {
              if (err.code !== 'LEVEL_NOT_FOUND') {
                peliasLogger.error('[admin_hierarchy_updater] Error updating key "%s": %s', streetKey, err.message);
              }
              notFound++;
            }
          }
          
          peliasLogger.info(
            '[admin_hierarchy_updater] Stats: addresses=%d, streets_to_update=%d, checked=%d, updated=%d, already_has_locality=%d, not_found=%d',
            addressCount,
            parentHierarchyMap.size,
            checked,
            updated,
            alreadyHasLocality,
            notFound
          );
          
          // Close database
          await db.close();
          peliasLogger.info('[admin_hierarchy_updater] Database closed (ready for street_generator)');
          done();
        } catch (e) {
          peliasLogger.error('[admin_hierarchy_updater] Fatal error:', e);
          if (db) {
            await db.close();
          }
          done(e);
        }
      })();
    }
  );
};

module.exports.generateStreetKey = generateStreetKey;
