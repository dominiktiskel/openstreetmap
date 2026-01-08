/**
 * Venue Collector (Pass 1)
 * 
 * Collects venues, POI, and addresses without street to LevelDB.
 * These documents are stored individually (not aggregated) with full WOF hierarchy.
 * 
 * Key format: venue|{layer}|{id}
 * Example: venue|venue|node:123456
 * 
 * Value: Full document data with coordinates and hierarchy
 * 
 * In Pass 2, these will be read from LevelDB and imported to Elasticsearch.
 * 
 * @version 2.0.0
 */

const through = require('through2');
const { Level } = require('level');
const path = require('path');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();
const _ = require('lodash');
const fs = require('fs');

// Configuration
const LEVELDB_PATH_BASE = _.get(peliasConfig, 'imports.openstreetmap.leveldbpath', require('os').tmpdir());
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-venues-v2'); // Separate DB for venues!

// In-memory buffer before writing to LevelDB
const BUFFER_SIZE = 1000;

module.exports = function() {
  let db = null;
  let buffer = [];
  let totalVenues = 0;
  let dbInitialized = false;
  
  // Initialize DB synchronously
  const initDB = async () => {
    if (!dbInitialized) {
      dbInitialized = true;
      try {
        // Ensure directory exists
        if (!fs.existsSync(DB_PATH)) {
          fs.mkdirSync(DB_PATH, { recursive: true });
        }
        
        db = new Level(DB_PATH, { valueEncoding: 'json' });
        await db.open();
        
        peliasLogger.info('[venue_collector] LevelDB opened at %s', DB_PATH);
      } catch (err) {
        peliasLogger.error('[venue_collector] Error opening database:', err);
      }
    }
  };
  
  const stream = through.obj(
    function transform(doc, enc, next) {
      // Initialize DB on first document
      if (!dbInitialized) {
        initDB().then(() => {
          processDocument(doc, next);
        }).catch(err => {
          peliasLogger.error('[venue_collector] DB init failed:', err);
          next();
        });
      } else {
        processDocument(doc, next);
      }
    },
    
    function flush(done) {
      // Final flush
      const closeDB = () => {
        if (db) {
          peliasLogger.info('[venue_collector] Closing database');
          db.close().then(() => {
            peliasLogger.info('[venue_collector] Database closed successfully');
            done();
          }).catch((err) => {
            peliasLogger.error('[venue_collector] Error closing database:', err);
            done(err);
          });
        } else {
          done();
        }
      };
      
      if (buffer.length > 0 && db) {
        flushBuffer(db, buffer, () => {
          peliasLogger.info(
            '[venue_collector] Final flush: %d venues/POI (including alternative names) saved to LevelDB',
            totalVenues
          );
          closeDB();
        });
      } else {
        if (totalVenues === 0) {
          peliasLogger.info('[venue_collector] No venues to save (including alternative names)');
        }
        closeDB(); // Close DB even if buffer is empty!
      }
    }
  );
  
  // Process document function
  function processDocument(doc, next) {
    try {
        // Extract document data
        const layer = doc.getLayer();
        const id = doc.getId();
        const name = doc.getName('default');
        const centroid = doc.getCentroid();
        
        if (!centroid || !centroid.lat || !centroid.lon) {
          return next(); // Skip documents without valid coordinates
        }
        
        // Extract OSM tags for alternative names
        const tags = doc.getMeta('tags');
        const originalName = name || (tags && tags.name) || '';
        
        // Parse alternative names from OSM tags
        const altNames = [];
        
        if (tags) {
          // Parse alt_name (semicolon-separated)
          if (tags.alt_name) {
            const parsed = tags.alt_name.split(';').map(n => n.trim()).filter(n => n);
            parsed.forEach((n, idx) => altNames.push({ type: 'alt', name: n, index: idx + 1 }));
          }
          
          // Parse short_name
          if (tags.short_name && tags.short_name.trim()) {
            altNames.push({ type: 'short', name: tags.short_name.trim() });
          }
          
          // Parse official_name
          if (tags.official_name && tags.official_name.trim()) {
            altNames.push({ type: 'official', name: tags.official_name.trim() });
          }
        }
        
        // Create venue data object for main name
        const venueData = {
          id: id,
          layer: layer,
          name: originalName,
          original_name: originalName,  // Store original name
          lat: centroid.lat,
          lon: centroid.lon,
          parent: {},
          categories: []  // Store categories for Pass 2
        };
        
        // Copy categories if available (direct property access, not a method)
        if (doc.category && doc.category.length > 0) {
          venueData.categories = doc.category;
        }
        
        // Copy type and type_name if available
        const osmType = doc.getMeta('osm_type');
        const osmTypeName = doc.getMeta('osm_type_name_pl');
        if (osmType) {
          venueData.osm_type = osmType;
        }
        if (osmTypeName) {
          venueData.osm_type_name_pl = osmTypeName;
        }
        
        // Copy type aliases if available
        const osmTypeAliases = doc.getMeta('osm_type_aliases_pl');
        if (osmTypeAliases && Array.isArray(osmTypeAliases)) {
          venueData.osm_type_aliases_pl = osmTypeAliases;
        }
        
        // Copy full parent hierarchy from WOF lookup
        if (doc.parent) {
          const hierarchyLevels = ['locality', 'localadmin', 'county', 'borough', 'neighbourhood', 'region', 'country'];
          for (const level of hierarchyLevels) {
            if (doc.parent[level] && doc.parent[level][0]) {
              venueData.parent[level] = doc.parent[level][0];
            }
          }
        }
        
        // Copy full address parts if available (street, number, zip, etc.)
        // Use getAddress() method to access address fields properly
        const street = doc.getAddress('street');
        const number = doc.getAddress('number');
        const zip = doc.getAddress('zip');
        
        if (street || number || zip) {
          venueData.address_parts = {
            street: street || '',
            number: number || '',
            zip: zip || '',
            name: doc.getAddress('name') || ''
          };
          
          // If has street, create name_with_street for search alias
          if (street && street.trim() && originalName) {
            venueData.name_with_street = `${originalName} ${street.trim()}`;
          }
        }
        
        // Also keep osmAdmin for backward compatibility
        if (doc.address_parts) {
          venueData.osmAdmin = {
            city: doc.address_parts.city || '',
            state: doc.address_parts.state || '',
            country: doc.address_parts.country || ''
          };
        }
        
        // Generate key: venue|layer|id
        const key = `venue|${layer}|${id}`;
        
        // Add main venue to buffer
        buffer.push({ key, value: venueData });
        totalVenues++;
        
        // Create records for alternative names
        altNames.forEach((alt) => {
          const suffix = alt.type === 'alt' ? `_alt${alt.index}` : `_${alt.type}`;
          const altKey = `venue|${layer}|${id}${suffix}`;
          
          const altVenueData = {
            id: `${id}${suffix}`,
            layer: layer,
            name: alt.name,
            original_name: originalName,  // Store original name
            lat: centroid.lat,
            lon: centroid.lon,
            parent: { ...venueData.parent }  // Same hierarchy
          };
          
          // Copy address parts if present
          if (venueData.address_parts) {
            altVenueData.address_parts = { ...venueData.address_parts };
            
            // Create name_with_street for alternative name too
            if (venueData.address_parts.street && venueData.address_parts.street.trim() && alt.name) {
              altVenueData.name_with_street = `${alt.name} ${venueData.address_parts.street.trim()}`;
            }
          }
          
          // Copy OSM admin if present
          if (venueData.osmAdmin) {
            altVenueData.osmAdmin = { ...venueData.osmAdmin };
          }
          
          // Copy categories (same as main venue)
          if (venueData.categories && venueData.categories.length > 0) {
            altVenueData.categories = venueData.categories;
          }
          
          // Copy type (same as main venue)
          if (venueData.osm_type) {
            altVenueData.osm_type = venueData.osm_type;
          }
          if (venueData.osm_type_name_pl) {
            altVenueData.osm_type_name_pl = venueData.osm_type_name_pl;
          }
          
          // Copy type aliases (same as main venue)
          if (venueData.osm_type_aliases_pl) {
            altVenueData.osm_type_aliases_pl = venueData.osm_type_aliases_pl;
          }
          
          buffer.push({ key: altKey, value: altVenueData });
          totalVenues++;
        });
        
        // Flush buffer if full
        if (buffer.length >= BUFFER_SIZE) {
          flushBuffer(db, buffer, () => {
            buffer = [];
            next();
          });
        } else {
          next();
        }
      } catch (err) {
        peliasLogger.error('[venue_collector] Error processing document:', err);
        next();
      }
  }
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};

/**
 * Flush buffer to LevelDB
 */
function flushBuffer(db, buffer, callback) {
  if (!db || buffer.length === 0) {
    return callback();
  }
  
  (async () => {
    try {
      for (const { key, value } of buffer) {
        await db.put(key, value);
      }
      callback();
    } catch (err) {
      peliasLogger.error('[venue_collector] Error flushing buffer:', err);
      callback(err);
    }
  })();
}

