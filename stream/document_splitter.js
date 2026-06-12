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
 * @version 2.10.0
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
        
        // Addresses with street OR highway streets → street collector (aggregation)
        if ((layer === 'address' && hasStreet) || layer === 'street') {
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
          const collector = ((layer === 'address' && hasStreet) || layer === 'street') ? streetCollector :
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
      
      // Wait for all collectors to truly close via EventEmitter.
      // Each collector is counted AT MOST ONCE, even if it emits both
      // 'closed' and 'error' - otherwise done() could fire prematurely.
      let closedCount = 0;
      const totalCollectors = 3;
      const settled = new Set();
      let firstError = null;
      
      const settle = (collectorName, err) => {
        if (settled.has(collectorName)) { return; }
        settled.add(collectorName);
        
        if (err) {
          peliasLogger.error('[document_splitter] Error closing %s:', collectorName, err);
          if (!firstError) { firstError = err; }
        } else {
          peliasLogger.info('[document_splitter] %s closed', collectorName);
        }
        
        closedCount++;
        if (closedCount === totalCollectors) {
          peliasLogger.info('[document_splitter] All collectors closed');
          done(firstError);
        }
      };
      
      // Listen for 'closed' and 'error' events from each collector
      streetCollector.events.once('closed', () => settle('Street collector'));
      localityCollector.events.once('closed', () => settle('Locality collector'));
      venueCollector.events.once('closed', () => settle('Venue collector'));
      
      streetCollector.events.once('error', (err) => settle('Street collector', err));
      localityCollector.events.once('error', (err) => settle('Locality collector', err));
      venueCollector.events.once('error', (err) => settle('Venue collector', err));
      
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

