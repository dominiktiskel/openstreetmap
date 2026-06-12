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
 * @version 2.10.0
 */

const through = require('through2');
const { Level } = require('level');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const fs = require('fs');
const { EventEmitter } = require('events');

// Configuration
const { VENUES_DB_PATH: DB_PATH } = require('../util/leveldb_paths'); // Separate DB for venues!

// In-memory buffer before writing to LevelDB
const BUFFER_SIZE = 500;  // Small buffer to prevent OOM with blocking flush

module.exports = function() {
  let db = null;
  let buffer = [];
  let totalVenues = 0;
  let dbInitialized = false;
  
  // Counter to track pending flush operations
  let pendingFlushes = 0;
  
  // EventEmitter to signal when truly closed
  const collectorEvents = new EventEmitter();
  
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
      (async () => {
        try {
          // Poll until all pending flushes complete
          if (pendingFlushes > 0) {
            peliasLogger.info('[venue_collector] Waiting for %d pending flushes to complete...', pendingFlushes);
            while (pendingFlushes > 0) {
              peliasLogger.debug('[venue_collector] Still waiting: %d pending flushes', pendingFlushes);
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          peliasLogger.info('[venue_collector] All pending flushes completed');
          
          // Flush remaining buffer if not empty
          if (buffer.length > 0 && db) {
            const batch = db.batch();
            for (const { key, value } of buffer) {
              batch.put(key, value);
            }
            await batch.write();
            peliasLogger.info(
              '[venue_collector] Final flush: %d venues/POI (including alternative names) saved to LevelDB',
              totalVenues
            );
          } else if (totalVenues === 0) {
            peliasLogger.info('[venue_collector] No venues to save (including alternative names)');
          }
          
          // Close database
          if (db) {
            peliasLogger.info('[venue_collector] Closing database');
            await db.close();
            peliasLogger.info('[venue_collector] Database closed, waiting for file lock release...');
            
            // Wait additional time for LevelDB to fully release file locks
            await new Promise(resolve => setTimeout(resolve, 3000));
            peliasLogger.info('[venue_collector] File lock release wait complete');
          }
          
          // Signal completion via EventEmitter
          collectorEvents.emit('closed');
          
          done();
        } catch (err) {
          peliasLogger.error('[venue_collector] Final flush error:', err);
          collectorEvents.emit('error', err);
          done(err);
        }
      })();
    }
  );
  
  // Attach EventEmitter to stream for external synchronization
  stream.events = collectorEvents;
  
  // Process document function
  function processDocument(doc, next) {
    try {
        // Extract document data
        const layer = doc.getLayer();
        const id = doc.getId();
        const name = doc.getName('default');
        const centroid = doc.getCentroid();
        const tags = doc.getMeta('tags');
        
        if (!centroid || !Number.isFinite(centroid.lat) || !Number.isFinite(centroid.lon)) {
          return next(); // Skip documents without valid coordinates
        }
        
        // Extract OSM tags for alternative names
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
          categories: [],  // Store categories for Pass 2
          popularity: 0    // Store popularity for Pass 2
        };
        
        // Copy categories if available (direct property access, not a method)
        if (doc.category && doc.category.length > 0) {
          venueData.categories = doc.category;
        }
        
        // Copy popularity if available (already computed in Pass 1!)
        const popularity = doc.getPopularity();
        if (popularity && popularity > 0) {
          venueData.popularity = popularity;
        }
        
        // Copy type and type_name if available
        const osmType = doc.getMeta('osm_type');
        const osmTypeName = doc.getMeta('osm_type_name');
        if (osmType) {
          venueData.osm_type = osmType;
        }
        if (osmTypeName) {
          venueData.osm_type_name = osmTypeName;
        }
        
        // Copy type aliases if available
        const osmTypeAliases = doc.getMeta('osm_type_aliases');
        if (osmTypeAliases && Array.isArray(osmTypeAliases)) {
          venueData.osm_type_aliases = osmTypeAliases;
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
        
        // Store brand/operator for searchable name aliases (Pass 2 adds them to name.default)
        if (tags) {
          if (tags.brand && tags.brand.trim() && tags.brand.trim() !== originalName) {
            venueData.brand = tags.brand.trim();
          }
          if (tags.operator && tags.operator.trim() && tags.operator.trim() !== originalName) {
            venueData.operator_name = tags.operator.trim();
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
          if (venueData.osm_type_name) {
            altVenueData.osm_type_name = venueData.osm_type_name;
          }
          
          // Copy type aliases (same as main venue)
          if (venueData.osm_type_aliases) {
            altVenueData.osm_type_aliases = venueData.osm_type_aliases;
          }
          
          buffer.push({ key: altKey, value: altVenueData });
          totalVenues++;
        });
        
        // Flush buffer if full - ASYNC (non-blocking)
        if (buffer.length >= BUFFER_SIZE) {
          const bufferToFlush = [...buffer];  // Copy buffer
          buffer = [];  // Clear buffer immediately
          
          // Increment counter BEFORE starting async operation
          pendingFlushes++;
          
          // Queue flush - counter-based tracking
          // (independent puts on distinct keys - safe to run without chaining)
          (async () => {
            if (!db || bufferToFlush.length === 0) {
              pendingFlushes--;
              return;
            }
            try {
              const batch = db.batch();
              for (const { key, value } of bufferToFlush) {
                batch.put(key, value);
              }
              await batch.write();
            } catch (err) {
              peliasLogger.error('[venue_collector] Error flushing buffer:', err);
            } finally {
              // Decrement counter when operation truly completes
              pendingFlushes--;
            }
          })();
        }
        
        next();
      } catch (err) {
        peliasLogger.error('[venue_collector] Error processing document:', err);
        next();
      }
  }
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};


