/**
 * Pass 2 Document Generator
 * 
 * Reads data from THREE separate LevelDB databases and generates documents for Elasticsearch.
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
 * 3. Localities DB (pelias-localities):
 *    - Individual locality documents (cities, towns, villages)
 *    - Full admin hierarchy from localityData.parent
 * 
 * Generated document types:
 * - Streets: layer='street' with house_numbers in addendum
 * - Addresses: layer='address' for specific house numbers (e.g., "Szkutnicza 10")
 * - Venues/POI: layer='venue' for points of interest
 * - Localities: layer='locality' for cities, towns, villages
 * 
 * Using separate databases prevents LEVEL_LOCKED errors from concurrent access!
 * 
 * This is the ONLY place where Elasticsearch client is created,
 * completely eliminating ES client reuse issues!
 * 
 * @version 2.9.0 - Per-address coordinates instead of street centroid
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
const LOCALITIES_DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-localities');

const NEAREST_STREET_RADIUS_M = 150;

/**
 * Spatial grid index for fast nearest-street lookup.
 * Divides the Earth into ~111m x ~70m cells (at 50N latitude).
 */
class StreetSpatialIndex {
  constructor() {
    this.grid = new Map();
    this.cellSize = 0.001; // ~111m latitude, ~70m longitude at 50N
    this.pointCount = 0;
  }

  _cellKey(lat, lon) {
    const latCell = Math.floor(lat / this.cellSize);
    const lonCell = Math.floor(lon / this.cellSize);
    return `${latCell}:${lonCell}`;
  }

  addStreet(streetName, lat, lon) {
    const key = this._cellKey(lat, lon);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push({ streetName, lat, lon });
    this.pointCount++;
  }

  _haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  findNearest(lat, lon, maxDistanceM) {
    const latCell = Math.floor(lat / this.cellSize);
    const lonCell = Math.floor(lon / this.cellSize);

    let best = null;
    let bestDist = maxDistanceM;

    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        const key = `${latCell + dLat}:${lonCell + dLon}`;
        const cell = this.grid.get(key);
        if (!cell) continue;
        for (const entry of cell) {
          const dist = this._haversineM(lat, lon, entry.lat, entry.lon);
          if (dist < bestDist) {
            bestDist = dist;
            best = entry;
          }
        }
      }
    }

    return best ? { streetName: best.streetName, distance: bestDist } : null;
  }
}

module.exports = function() {
  let enabled = ENABLE_AGGREGATION && IMPORT_STREETS;
  let streetsGenerated = 0;
  
  // Increase highWaterMark to reduce backpressure frequency
  // Default is 16 objects, we increase to 500 for better throughput while preventing memory overflow
  return through.obj({ highWaterMark: 500 },
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
      const localitiesExist = fs.existsSync(LOCALITIES_DB_PATH);
      
      if (!streetsExist && !venuesExist && !localitiesExist) {
        peliasLogger.warn('[pass2_document_generator] No LevelDB found - skipping');
        return done();
      }
      
      peliasLogger.info('[pass2_document_generator] ========================================');
      peliasLogger.info('[pass2_document_generator] Generating documents from LevelDB');
      peliasLogger.info('[pass2_document_generator] Configuration: highWaterMark=500, backpressure handling enabled');
      peliasLogger.info('[pass2_document_generator] Streets DB: %s', streetsExist ? 'found' : 'not found');
      peliasLogger.info('[pass2_document_generator] Venues DB: %s', venuesExist ? 'found' : 'not found');
      peliasLogger.info('[pass2_document_generator] Localities DB: %s', localitiesExist ? 'found' : 'not found');
      peliasLogger.info('[pass2_document_generator] ========================================');
      
      const self = this;
      let venuesGenerated = 0;
      let venuesWithNearestStreet = 0;
      let addressesGenerated = 0;  // Track address documents
      let localitiesGenerated = 0;  // Track locality documents
      let backpressureEvents = 0;  // Track backpressure events
      
      // Async iteration through BOTH LevelDB databases
      (async () => {
        try {
          // PHASE 0: Build spatial index of streets for nearest-street lookup
          const streetIndex = new StreetSpatialIndex();
          if (streetsExist) {
            peliasLogger.info('[pass2_document_generator] Building street spatial index...');
            let indexDb = null;
            let retries = 0;
            const MAX_IDX_RETRIES = 60;
            while (retries < MAX_IDX_RETRIES) {
              try {
                indexDb = new Level(STREETS_DB_PATH, { valueEncoding: 'json' });
                await indexDb.open();
                break;
              } catch (err) {
                if (err.code === 'LEVEL_LOCKED' && retries < MAX_IDX_RETRIES - 1) {
                  retries++;
                  const waitTime = Math.min(1000 * retries, 10000);
                  peliasLogger.warn('[pass2_document_generator] Streets DB locked (index build), retry %d/%d in %dms...', retries, MAX_IDX_RETRIES, waitTime);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                  throw err;
                }
              }
            }
            if (indexDb) {
              for await (const [key, aggregate] of indexDb.iterator()) {
                if (!aggregate || !aggregate.centroid || aggregate.centroid.count === 0) continue;
                const streetName = aggregate.streetName || key.split('|')[0];
                if (!streetName) continue;

                if (aggregate.numbers && Array.isArray(aggregate.numbers)) {
                  for (const item of aggregate.numbers) {
                    if (typeof item === 'object' && item.lat && item.lon) {
                      streetIndex.addStreet(streetName, item.lat, item.lon);
                    }
                  }
                }

                const avgLat = aggregate.centroid.lat / aggregate.centroid.count;
                const avgLon = aggregate.centroid.lon / aggregate.centroid.count;
                streetIndex.addStreet(streetName, avgLat, avgLon);
              }
              await indexDb.close();
              peliasLogger.info('[pass2_document_generator] Street spatial index ready: %d points in %d cells',
                streetIndex.pointCount, streetIndex.grid.size);
            }
          }

          // FIRST: Generate venue documents from venues DB
          if (venuesExist) {
            peliasLogger.info('[pass2_document_generator] Starting venues generation with backpressure handling...');
            
            // Retry logic for opening database - may be locked from Pass 1
            // For large files (e.g. Poland with 1M venues), flush queue can take several minutes
            let venuesDb = null;
            let retries = 0;
            const MAX_RETRIES = 60;  // 60 attempts = up to ~10 minutes total
            
            while (retries < MAX_RETRIES) {
              try {
                venuesDb = new Level(VENUES_DB_PATH, { valueEncoding: 'json' });
                await venuesDb.open();
                peliasLogger.info('[pass2_document_generator] Venues DB opened successfully');
                break;  // Success!
              } catch (err) {
                if (err.code === 'LEVEL_LOCKED' && retries < MAX_RETRIES - 1) {
                  retries++;
                  const waitTime = Math.min(1000 * retries, 10000);  // Exponential backoff, max 10s
                  peliasLogger.warn('[pass2_document_generator] Venues DB locked, retry %d/%d in %dms...', retries, MAX_RETRIES, waitTime);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                  throw err;  // Give up
                }
              }
            }
            
            if (!venuesDb) {
              throw new Error('Failed to open Venues DB after ' + MAX_RETRIES + ' retries');
            }
            
            for await (const [key, venueData] of venuesDb.iterator()) {
              try {
                const venueDoc = generateVenueDocument(venueData, streetIndex);
                if (venueDoc) {
                  if (venueDoc._nearestStreetAssigned) {
                    venuesWithNearestStreet++;
                    delete venueDoc._nearestStreetAssigned;
                  }
                  // Push with backpressure handling
                  if (!self.push(venueDoc)) {
                    backpressureEvents++;
                    if (backpressureEvents % 100 === 0) {
                      peliasLogger.debug('[pass2_document_generator] Venues: backpressure events: %d', backpressureEvents);
                    }
                    // Give downstream time to process - small delay to prevent overwhelming
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                  venuesGenerated++;
                  
                  if (venuesGenerated % 1000 === 0) {
                    peliasLogger.info('[pass2_document_generator] Generated %d venues', venuesGenerated);
                  }
                }
              } catch (err) {
                peliasLogger.error('[pass2_document_generator] Error processing venue "%s": %s', key, err.message);
              }
            }
            
            await venuesDb.close();
            peliasLogger.info('[pass2_document_generator] Venues complete: %d documents (%d with nearest-street assigned)', venuesGenerated, venuesWithNearestStreet);
          }
          
          // SECOND: Generate locality documents from localities DB
          if (localitiesExist) {
            peliasLogger.info('[pass2_document_generator] Starting localities generation with backpressure handling...');
            
            // Retry logic for opening database - may be locked from Pass 1
            let localitiesDb = null;
            let retries = 0;
            const MAX_RETRIES = 60;
            
            while (retries < MAX_RETRIES) {
              try {
                localitiesDb = new Level(LOCALITIES_DB_PATH, { valueEncoding: 'json' });
                await localitiesDb.open();
                peliasLogger.info('[pass2_document_generator] Localities DB opened successfully');
                break;
              } catch (err) {
                if (err.code === 'LEVEL_LOCKED' && retries < MAX_RETRIES - 1) {
                  retries++;
                  const waitTime = Math.min(1000 * retries, 10000);
                  peliasLogger.warn('[pass2_document_generator] Localities DB locked, retry %d/%d in %dms...', retries, MAX_RETRIES, waitTime);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                  throw err;
                }
              }
            }
            
            if (!localitiesDb) {
              throw new Error('Failed to open Localities DB after ' + MAX_RETRIES + ' retries');
            }
            
            for await (const [key, localityData] of localitiesDb.iterator()) {
              try {
                const localityDoc = generateLocalityDocument(localityData);
                if (localityDoc) {
                  // Push with backpressure handling
                  if (!self.push(localityDoc)) {
                    backpressureEvents++;
                    if (backpressureEvents % 100 === 0) {
                      peliasLogger.debug('[pass2_document_generator] Localities: backpressure events: %d', backpressureEvents);
                    }
                    // Give downstream time to process - small delay to prevent overwhelming
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                  localitiesGenerated++;
                  
                  if (localitiesGenerated % 1000 === 0) {
                    peliasLogger.info('[pass2_document_generator] Generated %d localities', localitiesGenerated);
                  }
                }
              } catch (err) {
                peliasLogger.error('[pass2_document_generator] Error processing locality "%s": %s', key, err.message);
              }
            }
            
            await localitiesDb.close();
            peliasLogger.info('[pass2_document_generator] Localities complete: %d documents', localitiesGenerated);
          }
          
          // THIRD: Generate street documents from streets DB
          if (streetsExist) {
            peliasLogger.info('[pass2_document_generator] Starting streets & addresses generation with backpressure handling...');
            
            // Retry logic for opening database - may be locked from Pass 1
            // For large files (e.g. Poland with 8.6M addresses), flush queue can take several minutes
            let streetsDb = null;
            let retries = 0;
            const MAX_RETRIES = 60;
            
            while (retries < MAX_RETRIES) {
              try {
                streetsDb = new Level(STREETS_DB_PATH, { valueEncoding: 'json' });
                await streetsDb.open();
                peliasLogger.info('[pass2_document_generator] Streets DB opened successfully');
                break;
              } catch (err) {
                if (err.code === 'LEVEL_LOCKED' && retries < MAX_RETRIES - 1) {
                  retries++;
                  const waitTime = Math.min(1000 * retries, 10000);
                  peliasLogger.warn('[pass2_document_generator] Streets DB locked, retry %d/%d in %dms...', retries, MAX_RETRIES, waitTime);
                  await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                  throw err;
                }
              }
            }
            
            if (!streetsDb) {
              throw new Error('Failed to open Streets DB after ' + MAX_RETRIES + ' retries');
            }
            
            for await (const [key, aggregate] of streetsDb.iterator()) {
              try {
                // Street aggregate processing
                const data = aggregate;
              
              // Validate aggregate - need at least a centroid (from address OR highway way)
              if (!aggregate) {
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
              
              // Add house numbers to addendum (may be empty for highway-only streets)
              if (data.numbers && data.numbers.length > 0) {
                streetDoc.setAddendum('osm', {
                  house_numbers: data.numbers.map(item => typeof item === 'object' ? item.num : item).join(',')
                });
              }
              
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
              
              // Add postal code if available
              if (data.zip && data.zip.trim()) {
                streetDoc.setAddress('zip', data.zip.trim());
              }
              
              // Push street document downstream with backpressure handling
              if (!self.push(streetDoc)) {
                backpressureEvents++;
                if (backpressureEvents % 100 === 0) {
                  peliasLogger.debug('[pass2_document_generator] Streets: backpressure events: %d', backpressureEvents);
                }
                // Give downstream time to process - small delay to prevent overwhelming
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              streetsGenerated++;
              
              // Generate individual address documents for each house number (when present)
              if (data.numbers && data.numbers.length > 0) {
                for (const houseNumItem of data.numbers) {
                  let houseNumber;
                  try {
                    // Support old format (string) and new format ({num, lat, lon})
                    houseNumber = typeof houseNumItem === 'object' ? houseNumItem.num : houseNumItem;
                    const addrLat = (typeof houseNumItem === 'object' && houseNumItem.lat) ? houseNumItem.lat : avgLat;
                    const addrLon = (typeof houseNumItem === 'object' && houseNumItem.lon) ? houseNumItem.lon : avgLon;

                    const addressId = `address_${streetName.toLowerCase().replace(/\s+/g, '_')}_${houseNumber}_${addrLat.toFixed(6)}_${addrLon.toFixed(6)}`;
                    
                    const addressDoc = new Document('openstreetmap', 'address', addressId)
                      .setName('default', `${streetName} ${houseNumber}`)
                      .setCentroid({ lat: addrLat, lon: addrLon })  // Use individual address coordinates
                      .setAddress('street', streetName)
                      .setAddress('number', houseNumber);
                    
                    // Add postal code if available
                    if (data.zip && data.zip.trim()) {
                      addressDoc.setAddress('zip', data.zip.trim());
                    }
                    
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
                    
                    // Push with backpressure handling
                    if (!self.push(addressDoc)) {
                      backpressureEvents++;
                      if (backpressureEvents % 100 === 0) {
                        peliasLogger.debug('[pass2_document_generator] Addresses: backpressure events: %d', backpressureEvents);
                      }
                      // Give downstream time to process - small delay to prevent overwhelming
                      await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    addressesGenerated++;
                  } catch (addrErr) {
                    peliasLogger.error('[pass2_document_generator] Error generating address %s %s: %s', streetName, houseNumber, addrErr.message);
                  }
                }
              }
              
              // Log progress
              if (streetsGenerated % 1000 === 0) {
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
            streetsGenerated + addressesGenerated + venuesGenerated + localitiesGenerated
          );
          peliasLogger.info('[pass2_document_generator]   - %d streets', streetsGenerated);
          peliasLogger.info('[pass2_document_generator]   - %d addresses', addressesGenerated);
          peliasLogger.info('[pass2_document_generator]   - %d venues/POI (%d with nearest-street)', venuesGenerated, venuesWithNearestStreet);
          peliasLogger.info('[pass2_document_generator]   - %d localities', localitiesGenerated);
          peliasLogger.info('[pass2_document_generator]   - %d backpressure events (pauses)', backpressureEvents);
          peliasLogger.info('[pass2_document_generator] ========================================');
          peliasLogger.info('[pass2_document_generator] Document generation complete!');
          peliasLogger.info('[pass2_document_generator] Documents are now in pipeline for Elasticsearch indexing...');
          peliasLogger.info('[pass2_document_generator] Check dbclient logs below for final indexing progress');
          peliasLogger.info('[pass2_document_generator] ========================================');
          
          // Clean up ALL LevelDB databases after successful generation
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
            if (fs.existsSync(LOCALITIES_DB_PATH)) {
              fs.rmSync(LOCALITIES_DB_PATH, { recursive: true, force: true });
              peliasLogger.info('[pass2_document_generator] Localities DB cleaned up');
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
 * Generate a venue/POI document from LevelDB data.
 * @param {Object} venueData - venue data from LevelDB
 * @param {StreetSpatialIndex} streetIndex - spatial index for nearest-street lookup
 */
function generateVenueDocument(venueData, streetIndex) {
  try {
    // Validate venue data
    if (!venueData || !venueData.id || !venueData.layer) {
      return null;
    }
    
    if (!venueData.lat || !venueData.lon) {
      peliasLogger.debug('[pass2_document_generator] Skipping venue (no coordinates): %s', venueData.id);
      return null;
    }
    
    // Determine effective street: from OSM data or via nearest-street lookup
    const hasOsmStreet = venueData.address_parts && venueData.address_parts.street && venueData.address_parts.street.trim();
    let effectiveStreet = hasOsmStreet ? venueData.address_parts.street.trim() : null;
    let nearestStreetAssigned = false;

    if (!effectiveStreet && streetIndex && streetIndex.pointCount > 0) {
      const nearest = streetIndex.findNearest(venueData.lat, venueData.lon, NEAREST_STREET_RADIUS_M);
      if (nearest) {
        effectiveStreet = nearest.streetName;
        nearestStreetAssigned = true;
      }
    }
    
    // Create venue document
    const venueDoc = new Document('openstreetmap', venueData.layer, venueData.id)
      .setCentroid({ lat: venueData.lat, lon: venueData.lon });
    
    // Add name if available
    if (venueData.name && venueData.name.trim()) {
      venueDoc.setName('default', venueData.name.trim());
    }
    
    // Add street name as name alias for better search (e.g., "Biedronka Sułowska")
    if (venueData.name_with_street && venueData.name_with_street.trim()) {
      venueDoc.setNameAlias('default', venueData.name_with_street.trim());
    }
    
    // Add brand/operator as searchable name aliases when they differ from the primary name
    if (venueData.brand) {
      venueDoc.setNameAlias('default', venueData.brand);
    }
    if (venueData.operator_name) {
      venueDoc.setNameAlias('default', venueData.operator_name);
    }
    
    // Add type name to separate 'type' field (lower boost than name.default in queries)
    // so venues with the search term in their actual name rank higher than type-only matches
    if (venueData.osm_type_name && venueData.osm_type_name.trim()) {
      const typeName = venueData.osm_type_name.trim();
      venueDoc.setNameAlias('type', typeName);
      
      if (effectiveStreet) {
        venueDoc.setNameAlias('type', `${typeName} ${effectiveStreet}`);
      }
    }
    
    // Add all type aliases to 'type' field (e.g., "Dentysta", "Stomatolog")
    if (venueData.osm_type_aliases && Array.isArray(venueData.osm_type_aliases)) {
      venueData.osm_type_aliases.forEach(alias => {
        if (alias && alias.trim()) {
          const aliasName = alias.trim();
          venueDoc.setNameAlias('type', aliasName);
          
          if (effectiveStreet) {
            venueDoc.setNameAlias('type', `${aliasName} ${effectiveStreet}`);
          }
        }
      });
    }
    
    // Add original_name to addendum if this is an alternative name
    if (venueData.original_name && venueData.original_name.trim()) {
      venueDoc.setAddendum('osm', {
        original_name: venueData.original_name.trim()
      });
    }
    
    // Set address_parts: use OSM data when available, otherwise nearest-street
    if (venueData.address_parts) {
      if (venueData.address_parts.street && venueData.address_parts.street.trim()) {
        venueDoc.setAddress('street', venueData.address_parts.street.trim());
      }
      if (venueData.address_parts.number && venueData.address_parts.number.trim()) {
        venueDoc.setAddress('number', venueData.address_parts.number.trim());
      }
      if (venueData.address_parts.zip && venueData.address_parts.zip.trim()) {
        venueDoc.setAddress('zip', venueData.address_parts.zip.trim());
      }
    }
    if (nearestStreetAssigned && effectiveStreet) {
      venueDoc.setAddress('street', effectiveStreet);
      venueDoc._nearestStreetAssigned = true;
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
    
    // Restore categories from Pass 1
    if (venueData.categories && venueData.categories.length > 0) {
      venueData.categories.forEach(category => {
        venueDoc.addCategory(category);
      });
    }
    
    // Restore popularity from Pass 1 (already computed!)
    if (venueData.popularity && venueData.popularity > 0) {
      venueDoc.setPopularity(venueData.popularity);
    }
    
    // Restore type and type_name to addendum.osm
    // These will be automatically exposed in API response
    if (venueData.osm_type || venueData.osm_type_name) {
      // Get existing OSM addendum or create new one
      const existingOsmAddendum = venueDoc.getAddendum('osm') || {};
      
      // Add type fields
      if (venueData.osm_type) {
        existingOsmAddendum.type = venueData.osm_type;
      }
      if (venueData.osm_type_name) {
        existingOsmAddendum.type_name = venueData.osm_type_name;
      }
      
      // Set back to document
      venueDoc.setAddendum('osm', existingOsmAddendum);
    }
    
    return venueDoc;
    
  } catch (err) {
    peliasLogger.error('[pass2_document_generator] Error generating venue document:', err);
    return null;
  }
}

/**
 * Generate a locality document from LevelDB data
 */
function generateLocalityDocument(localityData) {
  try {
    // Validate locality data
    if (!localityData || !localityData.id) {
      return null;
    }
    
    if (!localityData.lat || !localityData.lon) {
      peliasLogger.debug('[pass2_document_generator] Skipping locality (no coordinates): %s', localityData.id);
      return null;
    }
    
    // Create locality document (always layer='locality')
    const localityDoc = new Document('openstreetmap', 'locality', localityData.id)
      .setCentroid({ lat: localityData.lat, lon: localityData.lon });
    
    // Add name if available
    if (localityData.name && localityData.name.trim()) {
      localityDoc.setName('default', localityData.name.trim());
    }
    
    // Copy admin hierarchy from locality data (already from WOF in Pass 1!)
    if (localityData.parent) {
      // For localities, we don't want to add 'locality' level from parent
      // as the locality itself IS the locality
      const hierarchyLevels = ['localadmin', 'county', 'borough', 'region', 'country'];
      
      for (const placetype of hierarchyLevels) {
        if (localityData.parent[placetype] && localityData.parent[placetype].trim()) {
          const name = localityData.parent[placetype].trim();
          const osmId = 'osm:' + placetype + ':' + name.toLowerCase().replace(/\s+/g, '_');
          localityDoc.addParent(placetype, name, osmId, undefined);
        }
      }
    }
    
    // Add OSM admin data if available
    if (localityData.osmAdmin) {
      for (const [level, name] of Object.entries(localityData.osmAdmin)) {
        if (name && name.trim()) {
          const osmId = 'osm:' + level + ':' + name.toLowerCase().replace(/\s+/g, '_');
          localityDoc.addParent(level, name.trim(), osmId, 'osm');
        }
      }
    }
    
    // Add postal code if available
    if (localityData.postalcode && localityData.postalcode.trim()) {
      localityDoc.setAddress('zip', localityData.postalcode.trim());
    }
    
    return localityDoc;
    
  } catch (err) {
    peliasLogger.error('[pass2_document_generator] Error generating locality document:', err);
    return null;
  }
}

