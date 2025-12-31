/**
 * Pass 2 Document Generator (V2 Pipeline)
 * 
 * Reads data from TWO separate LevelDB databases and generates documents for Elasticsearch.
 * No WOF lookup needed - all hierarchy is already in LevelDB from Pass 1!
 * 
 * Databases:
 * 1. Streets DB (pelias-house-numbers-aggregation-v2):
 *    - Aggregated addresses by street|city|lat|lon
 *    - Generates ONE street document per key with house_numbers
 *    - ALSO generates individual address documents for each house number
 *    - Full admin hierarchy from aggregate.osmAdmin
 * 
 * 2. Venues DB (pelias-venues-v2):
 *    - Individual venue/POI documents
 *    - Full admin hierarchy from venueData.parent
 * 
 * Generated document types:
 * - Streets: layer='street' with house_numbers in addendum
 * - Addresses: layer='address' for specific house numbers (e.g., "Szkutnicza 10")
 * - Venues/POI: layer='venue' for points of interest
 * 
 * Using separate databases prevents LEVEL_LOCKED errors from concurrent access!
 * 
 * This is the ONLY place where Elasticsearch client is created in V2,
 * completely eliminating ES client reuse issues!
 * 
 * @version 1.9.7
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
const STREETS_DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-house-numbers-aggregation-v2');
const VENUES_DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-venues-v2');

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
      
      // Check if databases exist
      const streetsExist = fs.existsSync(STREETS_DB_PATH);
      const venuesExist = fs.existsSync(VENUES_DB_PATH);
      
      if (!streetsExist && !venuesExist) {
        peliasLogger.warn('[pass2_document_generator] No LevelDB found - skipping');
        return done();
      }
      
      peliasLogger.info('[pass2_document_generator] ========================================');
      peliasLogger.info('[pass2_document_generator] Generating documents from LevelDB');
      peliasLogger.info('[pass2_document_generator] Streets DB: %s', streetsExist ? 'found' : 'not found');
      peliasLogger.info('[pass2_document_generator] Venues DB: %s', venuesExist ? 'found' : 'not found');
      peliasLogger.info('[pass2_document_generator] ========================================');
      
      const self = this;
      let venuesGenerated = 0;
      let addressesGenerated = 0;  // NEW: Track address documents
      
      // Async iteration through BOTH LevelDB databases
      (async () => {
        try {
          // FIRST: Generate venue documents from venues DB
          if (venuesExist) {
            const venuesDb = new Level(VENUES_DB_PATH, { valueEncoding: 'json' });
            await venuesDb.open();
            
            for await (const [key, venueData] of venuesDb.iterator()) {
              try {
                const venueDoc = generateVenueDocument(venueData);
                if (venueDoc) {
                  self.push(venueDoc);
                  venuesGenerated++;
                  
                  if (venuesGenerated % 100 === 0) {
                    peliasLogger.info('[pass2_document_generator] Generated %d venues', venuesGenerated);
                  }
                }
              } catch (err) {
                peliasLogger.error('[pass2_document_generator] Error processing venue "%s": %s', key, err.message);
              }
            }
            
            await venuesDb.close();
            peliasLogger.info('[pass2_document_generator] Venues complete: %d documents', venuesGenerated);
          }
          
          // SECOND: Generate street documents from streets DB
          if (streetsExist) {
            const streetsDb = new Level(STREETS_DB_PATH, { valueEncoding: 'json' });
            await streetsDb.open();
            
            for await (const [key, aggregate] of streetsDb.iterator()) {
              try {
                // Street aggregate processing
                const data = aggregate;
              
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
              
              // ALSO generate individual address documents for each house number
              // This allows searching for specific addresses like "Szkutnicza 10"
              if (data.numbers && data.numbers.length > 0) {
                for (const houseNumber of data.numbers) {
                  try {
                    const addressId = `address_${streetName.toLowerCase().replace(/\s+/g, '_')}_${houseNumber}_${avgLat.toFixed(6)}_${avgLon.toFixed(6)}`;
                    
                    const addressDoc = new Document('openstreetmap', 'address', addressId)
                      .setName('default', `${streetName} ${houseNumber}`)
                      .setCentroid({ lat: avgLat, lon: avgLon })  // Use street centroid
                      .setAddress('street', streetName)
                      .setAddress('number', houseNumber);
                    
                    // Copy same admin hierarchy as street
                    if (data.osmAdmin) {
                      const adminLevels = ['locality', 'localadmin', 'county', 'borough', 'neighbourhood', 'region', 'country'];
                      for (const level of adminLevels) {
                        if (data.osmAdmin[level] && data.osmAdmin[level].trim()) {
                          const name = data.osmAdmin[level].trim();
                          const osmId = 'osm:' + level + ':' + name.toLowerCase().replace(/\s+/g, '_');
                          addressDoc.addParent(level, name, osmId, undefined);
                        }
                      }
                    }
                    
                    self.push(addressDoc);
                    addressesGenerated++;
                  } catch (addrErr) {
                    peliasLogger.error('[pass2_document_generator] Error generating address %s %s: %s', streetName, houseNumber, addrErr.message);
                  }
                }
              }
              
              // Log progress
              if (streetsGenerated % 100 === 0) {
                peliasLogger.info('[pass2_document_generator] Generated %d streets, %d addresses', streetsGenerated, addressesGenerated);
              }
              
            } catch (err) {
              peliasLogger.error('[pass2_document_generator] Error processing street "%s": %s', key, err.message);
            }
          }
          
          await streetsDb.close();
          peliasLogger.info('[pass2_document_generator] Streets complete: %d street docs, %d address docs', streetsGenerated, addressesGenerated);
        }
          
          // Summary
          peliasLogger.info('[pass2_document_generator] ========================================');
          peliasLogger.info(
            '[pass2_document_generator] Complete: %d total documents',
            streetsGenerated + addressesGenerated + venuesGenerated
          );
          peliasLogger.info('[pass2_document_generator]   - %d streets', streetsGenerated);
          peliasLogger.info('[pass2_document_generator]   - %d addresses', addressesGenerated);
          peliasLogger.info('[pass2_document_generator]   - %d venues/POI', venuesGenerated);
          peliasLogger.info('[pass2_document_generator] ========================================');
          
          // Clean up BOTH LevelDB databases after successful generation
          peliasLogger.info('[pass2_document_generator] Cleaning up LevelDB databases');
          try {
            if (fs.existsSync(STREETS_DB_PATH)) {
              fs.rmSync(STREETS_DB_PATH, { recursive: true, force: true });
              peliasLogger.info('[pass2_document_generator] Streets DB cleaned up');
            }
            if (fs.existsSync(VENUES_DB_PATH)) {
              fs.rmSync(VENUES_DB_PATH, { recursive: true, force: true });
              peliasLogger.info('[pass2_document_generator] Venues DB cleaned up');
            }
          } catch (err) {
            peliasLogger.warn('[pass2_document_generator] Failed to clean up LevelDB: %s', err.message);
          }
          
          done();
          
        } catch (err) {
          peliasLogger.error('[pass2_document_generator] Fatal error:', err);
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

