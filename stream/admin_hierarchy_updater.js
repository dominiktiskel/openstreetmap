/**
  Admin Hierarchy Updater
  
  Updates LevelDB aggregates with parent hierarchy from enriched addresses.
  
  Strategy:
  1. Transform phase: Collect parent hierarchy from addresses (group by rounded street key)
  2. Flush phase: Read actual keys from LevelDB, match with collected data, update
  
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
 * Generate APPROXIMATE street key for grouping addresses
 * (coordinates rounded to 0.01° - same as collector/enricher)
 */
function generateApproximateStreetKey(doc) {
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
  
  // Collect parent hierarchy grouped by APPROXIMATE street key
  // Map: approximateStreetKey -> {locality, region, country, count}
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
          
          const approximateKey = generateApproximateStreetKey(doc);
          const parentLocality = doc.parent && doc.parent.locality && doc.parent.locality[0];
          const parentRegion = doc.parent && doc.parent.region && doc.parent.region[0];
          const parentCountry = doc.parent && doc.parent.country && doc.parent.country[0];
          
          // Debug: Log first 3 addresses
          if (addressCount <= 3) {
            peliasLogger.info(
              '[admin_hierarchy_updater] Address #%d: street="%s", approx_key="%s", parent.locality=%j',
              addressCount,
              doc.getAddress('street'),
              approximateKey,
              doc.parent && doc.parent.locality
            );
          }
          
          // Collect parent hierarchy for this approximate street key
          // Use first non-empty value (priority: first address wins)
          if (parentLocality || parentRegion || parentCountry) {
            if (!parentHierarchyMap.has(approximateKey)) {
              parentHierarchyMap.set(approximateKey, {
                locality: parentLocality || '',
                region: parentRegion || '',
                country: parentCountry || '',
                count: 1
              });
            } else {
              // Increment count
              const existing = parentHierarchyMap.get(approximateKey);
              existing.count++;
              // Update if current has value and existing doesn't
              if (parentLocality && !existing.locality) existing.locality = parentLocality;
              if (parentRegion && !existing.region) existing.region = parentRegion;
              if (parentCountry && !existing.country) existing.country = parentCountry;
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

      peliasLogger.info(
        '[admin_hierarchy_updater] Collected parent hierarchy for %d approximate street keys from %d addresses',
        parentHierarchyMap.size,
        addressCount
      );

      // Open LevelDB (enricher has closed it by now)
      peliasLogger.info('[admin_hierarchy_updater] Opening LevelDB at: %s', DB_PATH);
      const db = new Level(DB_PATH, { valueEncoding: 'json' });
      
      let checked = 0;
      let updated = 0;
      let alreadyHasLocality = 0;
      let notMatched = 0;
      let iteratorStarted = false;

      // Update all aggregates (use async IIFE with proper await)
      const updateAggregates = async () => {
        try {
          // Explicitly open the database before iterating
          await db.open();
          peliasLogger.info('[admin_hierarchy_updater] LevelDB opened successfully, starting iteration...');
          
          for await (const [actualKey, aggregate] of db.iterator()) {
            if (!iteratorStarted) {
              iteratorStarted = true;
              peliasLogger.info('[admin_hierarchy_updater] Iterator started, processing first key: "%s"', actualKey);
            }
            try {
              if (!aggregate || Array.isArray(aggregate) || !aggregate.osmAdmin) {
                continue;
              }
              
              checked++;
              
              // Generate approximate key from actual key to match with collected data
              // actualKey format: "street|lat|lon" (already lowercased with 2 decimals)
              const approximateKey = actualKey; // They should match directly!
              
              const parentHierarchy = parentHierarchyMap.get(approximateKey);
              
              if (!parentHierarchy) {
                notMatched++;
                if (notMatched <= 3) {
                  peliasLogger.info(
                    '[admin_hierarchy_updater] No parent data for key "%s" (street: %s)',
                    actualKey,
                    aggregate.streetName
                  );
                }
                continue;
              }
              
              // Debug: Log first 3 matched aggregates
              if (checked <= 3) {
                peliasLogger.info(
                  '[admin_hierarchy_updater] Aggregate #%d: key="%s", street="%s", existing locality="%s", new locality="%s"',
                  checked,
                  actualKey,
                  aggregate.streetName,
                  aggregate.osmAdmin.locality || '(empty)',
                  parentHierarchy.locality
                );
              }
              
              let needsUpdate = false;
              
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
                await db.put(actualKey, aggregate);
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
              peliasLogger.error('[admin_hierarchy_updater] Error processing key "%s": %s', actualKey, err.message);
            }
          }
          
          peliasLogger.info(
            '[admin_hierarchy_updater] Stats: addresses=%d, collected_keys=%d, db_aggregates=%d, checked=%d, updated=%d, already_has_locality=%d, not_matched=%d',
            addressCount,
            parentHierarchyMap.size,
            checked,
            checked,
            updated,
            alreadyHasLocality,
            notMatched
          );
          
          // Close database
          await db.close();
          peliasLogger.info('[admin_hierarchy_updater] Database closed (ready for street_generator)');
        } catch (e) {
          peliasLogger.error('[admin_hierarchy_updater] Fatal error:', e);
          if (db) {
            try {
              await db.close();
            } catch (closeErr) {
              // Ignore close errors
            }
          }
          throw e;
        }
      };

      // Execute async update and call done when complete
      updateAggregates()
        .then(() => done())
        .catch((err) => done(err));
    }
  );
};

module.exports.generateApproximateStreetKey = generateApproximateStreetKey;
