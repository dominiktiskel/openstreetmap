/**
 * Street Extractor Stream
 *
 * Identifies OSM highway ways that have a name but no addr:housenumber,
 * and marks them as layer='street' so they flow to the street aggregation
 * path in the document splitter.
 *
 * This is only active when the import entry has importHighwayStreets=true
 * in pelias.json (propagated via item.importHighwayStreets from multiple_pbfs).
 *
 * Detection logic:
 * - Must have highway=* tag (residential, tertiary, secondary, primary,
 *   living_street, unclassified, pedestrian, service, road)
 * - Must have a default name
 * - Must NOT already be an address (layer='address') or locality
 * - Must NOT already have a house number
 *
 * This runs AFTER address_extractor and locality_extractor, BEFORE blacklistStream.
 *
 * @version 1.0.0
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');

const HIGHWAY_VALUES = new Set([
  'residential', 'tertiary', 'secondary', 'primary',
  'living_street', 'unclassified', 'pedestrian', 'service', 'road'
]);

module.exports = function() {
  let totalProcessed = 0;
  let totalStreets = 0;
  let totalSkippedNoFlag = 0;

  const stream = through.obj(
    function transform(doc, enc, next) {
      totalProcessed++;

      try {
        // Only act when importHighwayStreets is enabled for this import entry
        if (!doc.getMeta('importHighwayStreets')) {
          totalSkippedNoFlag++;
          return next(null, doc);
        }

        // Skip documents that already have a meaningful layer assigned
        const layer = doc.getLayer();
        if (layer === 'address' || layer === 'locality') {
          return next(null, doc);
        }

        // Skip if already has a house number (will be handled as address)
        if (doc.getAddress('number')) {
          return next(null, doc);
        }

        // Must have a name to be searchable
        const name = doc.getName('default');
        if (!name) {
          return next(null, doc);
        }

        // Must have a highway tag
        const tags = doc.getMeta('tags');
        if (!tags || !tags.highway) {
          return next(null, doc);
        }

        if (!HIGHWAY_VALUES.has(tags.highway)) {
          return next(null, doc);
        }

        // Mark as street layer and set address.street so aggregation key works
        doc.setLayer('street');
        doc.setAddress('street', name);

        totalStreets++;
        peliasLogger.debug('[street_extractor] Set street: %s (highway=%s)', name, tags.highway);

        if (totalStreets % 1000 === 0) {
          peliasLogger.info('[street_extractor] Processed %d highway streets so far', totalStreets);
        }

      } catch (e) {
        peliasLogger.error('[street_extractor] Error processing document:', e);
      }

      return next(null, doc);
    },

    function flush(done) {
      peliasLogger.info(
        '[street_extractor] Complete: %d highway streets identified from %d documents (%d skipped, importHighwayStreets not set)',
        totalStreets,
        totalProcessed,
        totalSkippedNoFlag
      );
      done();
    }
  );

  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));

  return stream;
};
