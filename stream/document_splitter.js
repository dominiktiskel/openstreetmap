/**
 * Document Splitter Stream (V2 Pipeline)
 * 
 * Routes documents after WOF lookup to one of two destinations:
 * 1. Addresses with street → houseNumbersCollectorV2 → LevelDB (for aggregation)
 * 2. Venues/POI or addresses without street → Elasticsearch (direct import)
 * 
 * This allows POI and non-street addresses to be imported in Pass 1,
 * while street addresses are aggregated and imported in Pass 2.
 * 
 * @version 1.9.0
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const houseNumbersCollectorV2 = require('./house_numbers_collector_v2');
const dbMapper = require('pelias-model').createDocumentMapperStream;
const elasticsearch = require('pelias-dbclient');

module.exports = function() {
  // Create streams for both paths
  const collector = houseNumbersCollectorV2();
  // Use separate ES client name to avoid "Do not reuse objects" error
  const esStream = dbMapper().pipe(elasticsearch({name: 'openstreetmap-pass1'}));
  
  // Statistics
  let totalDocs = 0;
  let toCollector = 0;
  let toElasticsearch = 0;
  
  const stream = through.obj(
    function transform(doc, enc, next) {
      totalDocs++;
      
      try {
        // Decision: where does this document go?
        const layer = doc.getLayer();
        const hasStreet = doc.getAddress('street');
        
        // Addresses with street → LevelDB for aggregation
        if (layer === 'address' && hasStreet) {
          toCollector++;
          collector.write(doc);
        }
        // Everything else → direct to Elasticsearch
        // (venues, POI, addresses without street)
        else {
          toElasticsearch++;
          esStream.write(doc);
        }
        
        // Log progress periodically
        if (totalDocs % 10000 === 0) {
          peliasLogger.info(
            '[document_splitter] Processed %d docs: %d to LevelDB, %d to Elasticsearch',
            totalDocs,
            toCollector,
            toElasticsearch
          );
        }
      } catch (err) {
        peliasLogger.error('[document_splitter] Error processing document:', err);
      }
      
      next(); // Don't push downstream - we're the end of the pipeline
    },
    
    function flush(done) {
      peliasLogger.info(
        '[document_splitter] Complete: %d docs total (%d to LevelDB, %d to Elasticsearch)',
        totalDocs,
        toCollector,
        toElasticsearch
      );
      
      // Close both streams
      collector.end(() => {
        esStream.end(() => {
          done();
        });
      });
    }
  );
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};

