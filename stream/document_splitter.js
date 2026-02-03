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
 * @version 2.8.2
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
        
        let canContinue = true;
        
        // Addresses with street → street collector (aggregation)
        if (layer === 'address' && hasStreet) {
          toStreetCollector++;
          canContinue = streetCollector.write(doc);
        }
        // Localities → locality collector (individual documents)
        else if (layer === 'locality') {
          toLocalityCollector++;
          canContinue = localityCollector.write(doc);
        }
        // Everything else → venue collector (individual documents)
        // (venues, POI, addresses without street)
        else {
          toVenueCollector++;
          canContinue = venueCollector.write(doc);
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
        
        // Handle backpressure - wait for drain if buffer is full
        if (!canContinue) {
          const collector = layer === 'address' && hasStreet ? streetCollector :
                           layer === 'locality' ? localityCollector :
                           venueCollector;
          collector.once('drain', next);
        } else {
          next();
        }
      } catch (err) {
        peliasLogger.error('[document_splitter] Error processing document:', err);
        next();
      }
    },
    
    function flush(done) {
      peliasLogger.info(
        '[document_splitter] Complete: %d docs total (%d streets, %d localities, %d venues/POI) - all to LevelDB',
        totalDocs,
        toStreetCollector,
        toLocalityCollector,
        toVenueCollector
      );
      
      // Wait for all collectors to truly close via EventEmitter
      let closedCount = 0;
      const totalCollectors = 3;
      
      const onClosed = (collectorName) => {
        peliasLogger.info('[document_splitter] %s closed', collectorName);
        closedCount++;
        if (closedCount === totalCollectors) {
          peliasLogger.info('[document_splitter] All collectors closed');
          done();
        }
      };
      
      // Listen for 'closed' events from each collector
      streetCollector.events.once('closed', () => onClosed('Street collector'));
      localityCollector.events.once('closed', () => onClosed('Locality collector'));
      venueCollector.events.once('closed', () => onClosed('Venue collector'));
      
      // Handle errors
      const onError = (err, collectorName) => {
        peliasLogger.error('[document_splitter] Error closing %s:', collectorName, err);
        // Still count it as closed to not block forever
        closedCount++;
        if (closedCount === totalCollectors) {
          done(err);
        }
      };
      
      streetCollector.events.once('error', (err) => onError(err, 'Street collector'));
      localityCollector.events.once('error', (err) => onError(err, 'Locality collector'));
      venueCollector.events.once('error', (err) => onError(err, 'Venue collector'));
      
      // Initiate closing - this will trigger the flush in each collector
      peliasLogger.info('[document_splitter] Initiating collector shutdown...');
      streetCollector.end();
      localityCollector.end();
      venueCollector.end();
    }
  );
  
  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));
  
  return stream;
};

