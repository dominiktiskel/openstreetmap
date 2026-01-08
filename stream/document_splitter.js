/**
 * Document Splitter Stream
 * 
 * Routes documents after WOF lookup to LevelDB:
 * 1. Addresses with street → houseNumbersCollector (aggregation key: street|city|lat|lon)
 * 2. Localities → localityCollector (individual key: locality|id)
 * 3. Venues/POI/addresses without street → venueCollector (individual key: venue|layer|id)
 * 
 * Pass 1: Everything to LevelDB (no Elasticsearch)
 * Pass 2: Everything from LevelDB to Elasticsearch
 * 
 * This completely eliminates ES client reuse issues!
 * 
 * @version 2.4.0
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const createHouseNumbersCollector = require('./house_numbers_collector');
const createVenueCollector = require('./venue_collector');
const createLocalityCollector = require('./locality_collector');

module.exports = function() {
  // Create collectors
  const streetCollector = createHouseNumbersCollector();
  const venueCollector = createVenueCollector();
  const localityCollector = createLocalityCollector();
  
  // Statistics
  let totalDocs = 0;
  let toStreetCollector = 0;
  let toVenueCollector = 0;
  let toLocalityCollector = 0;
  
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
        // Localities → locality collector (individual documents)
        else if (layer === 'locality') {
          toLocalityCollector++;
          localityCollector.write(doc);
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
            '[document_splitter] Processed %d docs: %d streets, %d localities, %d venues/POI',
            totalDocs,
            toStreetCollector,
            toLocalityCollector,
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
        '[document_splitter] Complete: %d docs total (%d streets, %d localities, %d venues/POI) - all to LevelDB',
        totalDocs,
        toStreetCollector,
        toLocalityCollector,
        toVenueCollector
      );
      
      // Close all three collectors
      streetCollector.end(() => {
        localityCollector.end(() => {
          venueCollector.end(() => {
            done();
          });
        });
      });
    }
  );
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};

