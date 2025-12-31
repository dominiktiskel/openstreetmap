/**
 * Document Splitter Stream (V2 Pipeline)
 * 
 * Routes documents after WOF lookup to LevelDB:
 * 1. Addresses with street → houseNumbersCollectorV2 (aggregation key: street|city|lat|lon)
 * 2. Venues/POI/addresses without street → venueCollectorV2 (individual key: venue|layer|id)
 * 
 * Pass 1: Everything to LevelDB (no Elasticsearch)
 * Pass 2: Everything from LevelDB to Elasticsearch
 * 
 * This completely eliminates ES client reuse issues!
 * 
 * @version 1.9.2
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const houseNumbersCollectorV2 = require('./house_numbers_collector_v2');
const venueCollectorV2 = require('./venue_collector_v2');

module.exports = function() {
  // Create collectors
  const streetCollector = houseNumbersCollectorV2();
  const venueCollector = venueCollectorV2();
  
  // Statistics
  let totalDocs = 0;
  let toStreetCollector = 0;
  let toVenueCollector = 0;
  
  const stream = through.obj(
    function transform(doc, enc, next) {
      totalDocs++;
      
      try {
        // Decision: where does this document go?
        const layer = doc.getLayer();
        const hasStreet = doc.getAddress('street');
        
        // Addresses with street → street collector (aggregation)
        if (layer === 'address' && hasStreet) {
          toStreetCollector++;
          streetCollector.write(doc);
        }
        // Everything else → venue collector (individual documents)
        // (venues, POI, addresses without street)
        else {
          toVenueCollector++;
          venueCollector.write(doc);
        }
        
        // Log progress periodically
        if (totalDocs % 10000 === 0) {
          peliasLogger.info(
            '[document_splitter] Processed %d docs: %d streets, %d venues/POI',
            totalDocs,
            toStreetCollector,
            toVenueCollector
          );
        }
      } catch (err) {
        peliasLogger.error('[document_splitter] Error processing document:', err);
      }
      
      next(); // Don't push downstream - we're the end of the pipeline
    },
    
    function flush(done) {
      peliasLogger.info(
        '[document_splitter] Complete: %d docs total (%d streets, %d venues/POI) - all to LevelDB',
        totalDocs,
        toStreetCollector,
        toVenueCollector
      );
      
      // Close both collectors
      streetCollector.end(() => {
        venueCollector.end(() => {
          done();
        });
      });
    }
  );
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};

