/**
 * Venue Collector V2 (V2 Pipeline)
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
 * @version 1.9.2
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
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-house-numbers-aggregation-v2');

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
        
        peliasLogger.info('[venue_collector_v2] LevelDB opened at %s', DB_PATH);
      } catch (err) {
        peliasLogger.error('[venue_collector_v2] Error opening database:', err);
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
          peliasLogger.error('[venue_collector_v2] DB init failed:', err);
          next();
        });
      } else {
        processDocument(doc, next);
      }
    },
    
    function flush(done) {
      // Final flush
      if (buffer.length > 0 && db) {
        flushBuffer(db, buffer, () => {
          peliasLogger.info(
            '[venue_collector_v2] Final flush: %d venues/POI saved to LevelDB',
            totalVenues
          );
          
          // Close database
          db.close().then(() => {
            done();
          }).catch((err) => {
            peliasLogger.error('[venue_collector_v2] Error closing database:', err);
            done(err);
          });
        });
      } else {
        peliasLogger.info('[venue_collector_v2] No venues to save');
        done();
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
        
        // Create venue data object
        const venueData = {
          id: id,
          layer: layer,
          name: name || '',
          lat: centroid.lat,
          lon: centroid.lon,
          parent: {}
        };
        
        // Copy full parent hierarchy from WOF lookup
        if (doc.parent) {
          const hierarchyLevels = ['locality', 'localadmin', 'county', 'borough', 'neighbourhood', 'region', 'country'];
          for (const level of hierarchyLevels) {
            if (doc.parent[level] && doc.parent[level][0]) {
              venueData.parent[level] = doc.parent[level][0];
            }
          }
        }
        
        // Copy OSM admin data if available (from addr:* tags)
        if (doc.address_parts) {
          venueData.osmAdmin = {
            city: doc.address_parts.city || '',
            state: doc.address_parts.state || '',
            country: doc.address_parts.country || ''
          };
        }
        
        // Generate key: venue|layer|id
        const key = `venue|${layer}|${id}`;
        
        // Add to buffer
        buffer.push({ key, value: venueData });
        totalVenues++;
        
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
        peliasLogger.error('[venue_collector_v2] Error processing document:', err);
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
      peliasLogger.error('[venue_collector_v2] Error flushing buffer:', err);
      callback(err);
    }
  })();
}

