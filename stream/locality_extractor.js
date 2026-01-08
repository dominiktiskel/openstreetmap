/**
 * Locality Extractor Stream
 * 
 * Identifies OSM features that represent localities (cities, towns, villages)
 * and changes their layer from 'venue' to 'locality' for proper classification.
 * 
 * Detection Logic:
 * - PRIMARY: place=city|town|village
 * - SECONDARY: boundary=administrative with admin_level=6,7,8 (Polish localities)
 * 
 * This runs AFTER address_extractor and BEFORE document_splitter,
 * ensuring localities are routed to locality_collector instead of venue_collector.
 * 
 * @version 2.4.0
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');

module.exports = function(){
  let totalProcessed = 0;
  let totalLocalities = 0;

  const stream = through.obj(
    function transform(doc, enc, next) {
      totalProcessed++;
      
      try {
        // Skip if no tags
        const tags = doc.getMeta('tags');
        if (!tags) {
          return next(null, doc);
        }

        let isLocality = false;
        let detectionMethod = '';
        
        // PRIMARY: Check place tag
        // These are the most reliable indicators of localities
        const placeTag = tags.place;
        if (placeTag === 'city' || placeTag === 'town' || placeTag === 'village') {
          isLocality = true;
          detectionMethod = `place=${placeTag}`;
        }
        
        // SECONDARY: Check boundary + admin_level (only if no place tag)
        // This handles cases like cities with county rights (Wrocław, etc.)
        // where admin_level may be 6 instead of the standard 8
        if (!isLocality && tags.boundary === 'administrative') {
          const adminLevel = parseInt(tags.admin_level);
          
          // admin_level 6,7,8 for Polish localities
          // 6 = miasta na prawach powiatu (cities with county rights)
          // 7 = gmina (municipality) - sometimes used for towns
          // 8 = miejscowość (locality) - standard for villages/towns
          if (adminLevel === 6 || adminLevel === 7 || adminLevel === 8) {
            // Must have a name to be considered a searchable locality
            const name = doc.getName('default');
            if (name) {
              isLocality = true;
              detectionMethod = `boundary=administrative, admin_level=${adminLevel}`;
            }
          }
        }
        
        // Change layer if identified as locality
        if (isLocality) {
          const name = doc.getName('default');
          doc.setLayer('locality');
          totalLocalities++;
          
          peliasLogger.debug('[locality_extractor] Set locality: %s (%s)', name, detectionMethod);
          
          // Log progress periodically
          if (totalLocalities % 1000 === 0) {
            peliasLogger.info('[locality_extractor] Processed %d localities so far', totalLocalities);
          }
        }
        
      } catch(e) {
        peliasLogger.error('[locality_extractor] Error processing document:', e);
      }
      
      return next(null, doc);
    },
    
    function flush(done) {
      peliasLogger.info(
        '[locality_extractor] Complete: %d localities identified from %d documents',
        totalLocalities,
        totalProcessed
      );
      done();
    }
  );

  // Catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));

  return stream;
};

