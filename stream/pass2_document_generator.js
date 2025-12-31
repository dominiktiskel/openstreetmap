/**
 * Pass 2 Document Generator (V2 Pipeline)
 * 
 * Reads data from LevelDB and generates documents for Elasticsearch.
 * No WOF lookup needed - all hierarchy is already in LevelDB from Pass 1!
 * 
 * Handles two types of documents:
 * 1. Streets (aggregated from addresses):
 *    - Key format: street|city|lat|lon
 *    - Generates ONE street document per key with house_numbers
 *    - Full admin hierarchy from aggregate.osmAdmin
 * 
 * 2. Venues/POI (individual documents):
 *    - Key format: venue|layer|id
 *    - Generates individual venue/POI documents
 *    - Full admin hierarchy from venueData.parent
 * 
 * This is the ONLY place where Elasticsearch client is created in V2,
 * completely eliminating ES client reuse issues!
 * 
 * @version 1.9.2
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
      peliasLogger.info('[pass2_document_generator] Generating documents from LevelDB');
      peliasLogger.info('[pass2_document_generator] (streets + venues/POI)');
      peliasLogger.info('[pass2_document_generator] ========================================');
      
      const self = this;
      let venuesGenerated = 0;
      
      // Async iteration through LevelDB
      (async () => {
        const db = new Level(DB_PATH, { valueEncoding: 'json' });
        
        try {
          await db.open();
          
          for await (const [key, data] of db.iterator()) {
            try {
              // Check if this is a venue document (key starts with "venue|")
              if (key.startsWith('venue|')) {
                // Generate venue document
                const venueDoc = generateVenueDocument(data);
                if (venueDoc) {
                  self.push(venueDoc);
                  venuesGenerated++;
                }
                continue;
              }
              
              // Otherwise, it's a street aggregate
              const aggregate = data;
              
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
              if ((streetsGenerated + venuesGenerated) % 1000 === 0) {
                peliasLogger.info(
                  '[pass2_document_generator] Generated %d documents (%d streets, %d venues/POI)',
                  streetsGenerated + venuesGenerated,
                  streetsGenerated,
                  venuesGenerated
                );
              }
              
            } catch (err) {
              peliasLogger.error('[pass2_document_generator] Error processing key "%s": %s', key, err.message);
            }
          }
          
          await db.close();
          
          peliasLogger.info('[pass2_document_generator] ========================================');
          peliasLogger.info(
            '[pass2_document_generator] Complete: %d total documents (%d streets, %d venues/POI)',
            streetsGenerated + venuesGenerated,
            streetsGenerated,
            venuesGenerated
          );
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

/**
 * Generate a venue/POI document from LevelDB data
 */
function generateVenueDocument(venueData) {
  try {
    // Validate venue data
    if (!venueData || !venueData.id || !venueData.layer) {
      return null;
    }
    
    if (!venueData.lat || !venueData.lon) {
      peliasLogger.debug('[pass2_document_generator] Skipping venue (no coordinates): %s', venueData.id);
      return null;
    }
    
    // Create venue document
    const venueDoc = new Document('openstreetmap', venueData.layer, venueData.id)
      .setCentroid({ lat: venueData.lat, lon: venueData.lon });
    
    // Add name if available
    if (venueData.name && venueData.name.trim()) {
      venueDoc.setName('default', venueData.name.trim());
    }
    
    // Copy FULL admin hierarchy from venue data (already from WOF in Pass 1!)
    if (venueData.parent) {
      const hierarchyLevels = ['locality', 'localadmin', 'county', 'borough', 'neighbourhood', 'region', 'country'];
      
      for (const placetype of hierarchyLevels) {
        if (venueData.parent[placetype] && venueData.parent[placetype].trim()) {
          const name = venueData.parent[placetype].trim();
          const osmId = 'osm:' + placetype + ':' + name.toLowerCase().replace(/\s+/g, '_');
          venueDoc.addParent(placetype, name, osmId, undefined);
        }
      }
    }
    
    return venueDoc;
    
  } catch (err) {
    peliasLogger.error('[pass2_document_generator] Error generating venue document:', err);
    return null;
  }
}

