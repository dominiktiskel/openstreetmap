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
 * @version 2.8.1
 */

const through = require('through2');
const { Level } = require('level');
const path = require('path');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();
const _ = require('lodash');
const fs = require('fs');
const { EventEmitter } = require('events');

// Configuration
const LEVELDB_PATH_BASE = _.get(peliasConfig, 'imports.openstreetmap.leveldbpath', require('os').tmpdir());
const DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-localities'); // Separate DB for localities!

// In-memory buffer before writing to LevelDB
const BUFFER_SIZE = 500;  // Small buffer to prevent OOM with blocking flush

module.exports = function() {
  let db = null;
  let buffer = [];
  let totalLocalities = 0;
  let dbInitialized = false;
  
  // Async flush queue to ensure sequential execution
  let flushQueue = Promise.resolve();
  
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
      (async () => {
        try {
          // Wait for all queued flushes to complete
          peliasLogger.info('[locality_collector] Waiting for async flush queue to complete...');
          await flushQueue;
          peliasLogger.info('[locality_collector] All queued flushes completed');
          
          // Flush remaining buffer if not empty
          if (buffer.length > 0 && db) {
            const batch = db.batch();
            for (const { key, value } of buffer) {
              batch.put(key, value);
            }
            await batch.write();
            peliasLogger.info(
              '[locality_collector] Final flush: %d localities saved to LevelDB',
              totalLocalities
            );
          } else if (totalLocalities === 0) {
            peliasLogger.info('[locality_collector] No localities to save');
          }
          
          // Close database
          if (db) {
            peliasLogger.info('[locality_collector] Closing database');
            await db.close();
            peliasLogger.info('[locality_collector] Database closed, waiting for file lock release...');
            
            // Wait additional time for LevelDB to fully release file locks
            await new Promise(resolve => setTimeout(resolve, 3000));
            peliasLogger.info('[locality_collector] File lock release wait complete');
          }
          
          // Signal completion via EventEmitter
          collectorEvents.emit('closed');
          
          done();
        } catch (err) {
          peliasLogger.error('[locality_collector] Final flush error:', err);
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
        
        // Flush buffer if it's full - ASYNC (non-blocking)
        if (buffer.length >= BUFFER_SIZE) {
          const bufferToFlush = buffer.slice();
          buffer = [];
          
          // Add flush to queue - ASYNC, doesn't block stream
          flushQueue = flushQueue.then(async () => {
            if (!db || bufferToFlush.length === 0) return;
            try {
              const batch = db.batch();
              for (const { key, value } of bufferToFlush) {
                batch.put(key, value);
              }
              await batch.write();
              peliasLogger.debug('[locality_collector] Buffer flushed: %d localities', bufferToFlush.length);
            } catch (err) {
              peliasLogger.error('[locality_collector] Error flushing buffer:', err);
            }
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


