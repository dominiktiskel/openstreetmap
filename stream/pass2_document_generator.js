/**
 * Pass 2 Document Generator (V2 Pipeline)
 * 
 * Reads aggregated data from LevelDB and generates street documents.
 * No WOF lookup needed - all hierarchy is already in LevelDB!
 * 
 * For each aggregate in LevelDB:
 * - Create ONE street document with house_numbers
 * - Copy full admin hierarchy from aggregate.osmAdmin
 * - No individual address documents (tradeoff for performance)
 * 
 * Note: Individual addresses are NOT generated in V2 to avoid:
 * - Storing full coordinates for each address in LevelDB (wastes space)
 * - Reading OSM PBF twice (V1 does this, V2 avoids it)
 * 
 * Users who need individual addresses should use V1 pipeline.
 * V2 provides street-level search which covers most geocoding use cases.
 * 
 * @version 1.9.0
 */

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
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-house-numbers-aggregation-v2');

module.exports = function() {
  let enabled = ENABLE_AGGREGATION && IMPORT_STREETS;
  let streetsGenerated = 0;
  
  return through.obj(
    // Transform function - pass through (no documents come in)
    function(doc, enc, next) {
      next();
    },
    
    // Flush function - generate all documents from LevelDB
    function(done) {
      if (!enabled) {
        peliasLogger.info('[pass2_document_generator] Document generation disabled');
        return done();
      }
      
      // Check if database exists
      if (!fs.existsSync(DB_PATH)) {
        peliasLogger.warn('[pass2_document_generator] LevelDB not found at %s - skipping', DB_PATH);
        return done();
      }
      
      peliasLogger.info('[pass2_document_generator] ========================================');
      peliasLogger.info('[pass2_document_generator] Generating street documents from LevelDB');
      peliasLogger.info('[pass2_document_generator] ========================================');
      
      const self = this;
      
      // Async iteration through LevelDB
      (async () => {
        const db = new Level(DB_PATH, { valueEncoding: 'json' });
        
        try {
          await db.open();
          
          for await (const [key, aggregate] of db.iterator()) {
            try {
              // Validate aggregate
              if (!aggregate || !aggregate.numbers || aggregate.numbers.length === 0) {
                continue;
              }
              
              if (!aggregate.centroid || aggregate.centroid.count === 0) {
                peliasLogger.debug('[pass2_document_generator] Skipping street (no centroid): %s', key);
                continue;
              }
              
              // Get street name
              const streetName = aggregate.streetName || key.split('|')[0];
              if (!streetName) {
                peliasLogger.debug('[pass2_document_generator] Skipping street (no name): %s', key);
                continue;
              }
              
              // Calculate average centroid
              const avgLat = aggregate.centroid.lat / aggregate.centroid.count;
              const avgLon = aggregate.centroid.lon / aggregate.centroid.count;
              
              // Generate unique ID for street
              const streetId = `street_${key.replace(/\|/g, '_')}`;
              
              // Create street document
              const streetDoc = new Document('openstreetmap', 'street', streetId)
                .setName('default', streetName)
                .setCentroid({ lat: avgLat, lon: avgLon });
              
              // Add house numbers to addendum
              streetDoc.setAddendum('osm', {
                house_numbers: aggregate.numbers.join(',')
              });
              
              // Copy FULL admin hierarchy from aggregate (NO WOF lookup needed!)
              if (aggregate.osmAdmin) {
                const osmAdmin = aggregate.osmAdmin;
                
                // Add locality
                if (osmAdmin.locality && osmAdmin.locality.trim()) {
                  const locality = osmAdmin.locality.trim();
                  const osmId = 'osm:locality:' + locality.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('locality', locality, osmId, undefined);
                }
                
                // Add localadmin
                if (osmAdmin.localadmin && osmAdmin.localadmin.trim()) {
                  const localadmin = osmAdmin.localadmin.trim();
                  const osmId = 'osm:localadmin:' + localadmin.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('localadmin', localadmin, osmId, undefined);
                }
                
                // Add county
                if (osmAdmin.county && osmAdmin.county.trim()) {
                  const county = osmAdmin.county.trim();
                  const osmId = 'osm:county:' + county.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('county', county, osmId, undefined);
                }
                
                // Add borough
                if (osmAdmin.borough && osmAdmin.borough.trim()) {
                  const borough = osmAdmin.borough.trim();
                  const osmId = 'osm:borough:' + borough.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('borough', borough, osmId, undefined);
                }
                
                // Add neighbourhood
                if (osmAdmin.neighbourhood && osmAdmin.neighbourhood.trim()) {
                  const neighbourhood = osmAdmin.neighbourhood.trim();
                  const osmId = 'osm:neighbourhood:' + neighbourhood.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('neighbourhood', neighbourhood, osmId, undefined);
                }
                
                // Add region
                if (osmAdmin.region && osmAdmin.region.trim()) {
                  const region = osmAdmin.region.trim();
                  const osmId = 'osm:region:' + region.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('region', region, osmId, undefined);
                }
                
                // Add country
                if (osmAdmin.country && osmAdmin.country.trim()) {
                  const country = osmAdmin.country.trim();
                  const osmId = 'osm:country:' + country.toLowerCase().replace(/\s+/g, '_');
                  streetDoc.addParent('country', country, osmId, undefined);
                }
              }
              
              // Push street document downstream
              self.push(streetDoc);
              streetsGenerated++;
              
              // Log progress
              if (streetsGenerated % 1000 === 0) {
                peliasLogger.info('[pass2_document_generator] Generated %d street documents', streetsGenerated);
              }
              
            } catch (err) {
              peliasLogger.error('[pass2_document_generator] Error processing key "%s": %s', key, err.message);
            }
          }
          
          await db.close();
          
          peliasLogger.info('[pass2_document_generator] ========================================');
          peliasLogger.info('[pass2_document_generator] Complete: %d street documents generated', streetsGenerated);
          peliasLogger.info('[pass2_document_generator] ========================================');
          
          // Clean up LevelDB after successful generation
          peliasLogger.info('[pass2_document_generator] Cleaning up LevelDB');
          try {
            fs.rmSync(DB_PATH, { recursive: true, force: true });
            peliasLogger.info('[pass2_document_generator] LevelDB cleaned up successfully');
          } catch (err) {
            peliasLogger.warn('[pass2_document_generator] Failed to clean up LevelDB: %s', err.message);
          }
          
          done();
          
        } catch (err) {
          peliasLogger.error('[pass2_document_generator] Fatal error:', err);
          if (db) {
            await db.close();
          }
          done(err);
        }
      })();
    }
  );
};

