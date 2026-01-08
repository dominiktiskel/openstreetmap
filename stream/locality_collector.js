/**
 * Locality Collector (Pass 1)
 * 
 * Collects localities (cities, towns, villages) to LevelDB.
 * These documents are stored individually with full WOF hierarchy.
 * 
 * Key format: locality|{id}
 * Example: locality|node:123456
 * 
 * Value: Full document data with coordinates and hierarchy
 * 
 * In Pass 2, these will be read from LevelDB and imported to Elasticsearch.
 * 
 * @version 2.4.0
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
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-localities'); // Separate DB for localities!

// In-memory buffer before writing to LevelDB
const BUFFER_SIZE = 1000;

module.exports = function() {
  let db = null;
  let buffer = [];
  let totalLocalities = 0;
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
        
        peliasLogger.info('[locality_collector] LevelDB opened at %s', DB_PATH);
      } catch (err) {
        peliasLogger.error('[locality_collector] Error opening database:', err);
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
          peliasLogger.error('[locality_collector] DB init failed:', err);
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
          peliasLogger.info('[locality_collector] Closing database');
          db.close().then(() => {
            peliasLogger.info('[locality_collector] Database closed successfully');
            done();
          }).catch((err) => {
            peliasLogger.error('[locality_collector] Error closing database:', err);
            done(err);
          });
        } else {
          done();
        }
      };
      
      if (buffer.length > 0 && db) {
        flushBuffer(db, buffer, () => {
          peliasLogger.info(
            '[locality_collector] Final flush: %d localities saved to LevelDB',
            totalLocalities
          );
          closeDB();
        });
      } else {
        if (totalLocalities === 0) {
          peliasLogger.info('[locality_collector] No localities to save');
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
        
        // Create locality data object
        // Key format: locality|{id}
        const key = `locality|${id}`;
        
        const localityData = {
          id: id,
          layer: 'locality',  // Always 'locality'
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
              localityData.parent[level] = doc.parent[level][0];
            }
          }
        }
        
        // Copy OSM admin data if available
        const osmAdmin = doc.getMeta('osmAdmin');
        if (osmAdmin && Object.keys(osmAdmin).length > 0) {
          localityData.osmAdmin = {};
          for (const [level, name] of Object.entries(osmAdmin)) {
            if (name) {
              localityData.osmAdmin[level] = name;
            }
          }
        }
        
        // Copy postal code if available
        const postalCode = doc.getAddress('zip');
        if (postalCode && postalCode.trim()) {
          localityData.postalcode = postalCode.trim();
        }
        
        // Add to buffer
        buffer.push({ key: key, value: localityData });
        totalLocalities++;
        
        // Flush buffer if it's full
        if (buffer.length >= BUFFER_SIZE) {
          const currentBuffer = buffer.slice();
          buffer = [];
          
          flushBuffer(db, currentBuffer, () => {
            peliasLogger.debug('[locality_collector] Buffer flushed: %d localities', currentBuffer.length);
          });
        }
        
    } catch (err) {
      peliasLogger.error('[locality_collector] Error processing document:', err);
    }
    
    next();
  }
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};

/**
 * Flush buffer to LevelDB using batch operation
 */
function flushBuffer(db, buffer, callback) {
  if (!db || buffer.length === 0) {
    return callback();
  }
  
  // Prepare batch operations
  const batch = buffer.map(item => ({
    type: 'put',
    key: item.key,
    value: item.value
  }));
  
  // Execute batch
  db.batch(batch)
    .then(() => {
      callback();
    })
    .catch(err => {
      peliasLogger.error('[locality_collector] Error flushing buffer to LevelDB:', err);
      callback(err);
    });
}

