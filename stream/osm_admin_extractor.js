
/**
  The OSM admin extractor is responsible for extracting administrative hierarchy
  information from OSM address tags (addr:city, addr:state, addr:country) and
  populating the document's parent fields BEFORE WhosOnFirst admin lookup runs.

  This allows OSM data to take priority over WOF data when available, while
  still using WOF as a fallback for missing fields.

  OSM Tag Mapping:
  - addr:city     -> parent.locality
  - addr:state    -> parent.region
  - addr:country  -> parent.country
**/

const through = require('through2');
const _ = require('lodash');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();

// Mapping from address_parts field names to parent hierarchy field names
const ADMIN_MAPPING = {
  'city': 'locality',
  'state': 'region',
  'country': 'country'
};

module.exports = function(){
  // Check if OSM admin prioritization is enabled (default: true)
  const preferOsmAdmin = _.get(peliasConfig, 'imports.openstreetmap.preferOsmAdmin', true);
  
  if (!preferOsmAdmin) {
    peliasLogger.info('[osm_admin_extractor] OSM admin prioritization disabled, passing through');
    return through.obj(function(doc, enc, next) {
      return next(null, doc);
    });
  }

  peliasLogger.info('[osm_admin_extractor] OSM admin prioritization enabled');

  var stream = through.obj( function( doc, enc, next ) {

    try {
      // Get the address parts that were populated by the tag mapper
      const addressParts = doc.address_parts || {};

      // Track which admin fields were populated from OSM
      const osmAdminFields = [];

      // Process each admin field from OSM tags
      _.each(ADMIN_MAPPING, (parentField, addressField) => {
        const value = addressParts[addressField];
        
        if (value && typeof value === 'string' && value.trim().length > 0) {
          try {
            // Use addParent to set the hierarchy field
            // Note: We don't have WOF IDs for OSM data, so id is set to null
            // abbr is also null as OSM tags don't typically include abbreviations
            doc.addParent(parentField, value.trim(), null, null);
            osmAdminFields.push(parentField);
            
            peliasLogger.debug('[osm_admin_extractor] Set parent.' + parentField + ' from OSM tag', {
              gid: doc.getGid(),
              field: parentField,
              value: value.trim()
            });
          }
          catch (err) {
            peliasLogger.warn('[osm_admin_extractor] Failed to add parent field', {
              gid: doc.getGid(),
              field: parentField,
              value: value,
              error: err.message
            });
          }
        }
      });

      // Mark which fields came from OSM so WOF lookup can skip them
      if (osmAdminFields.length > 0) {
        doc.setMeta('osmAdminFields', osmAdminFields);
        peliasLogger.debug('[osm_admin_extractor] Populated admin fields from OSM', {
          gid: doc.getGid(),
          fields: osmAdminFields
        });
      }
    }
    catch (e) {
      peliasLogger.error('[osm_admin_extractor] error processing document', {
        error: e.message,
        stack: e.stack,
        gid: doc.getGid ? doc.getGid() : 'unknown'
      });
    }

    // Always pass the document downstream
    return next(null, doc);
  });

  // catch stream errors
  stream.on('error', peliasLogger.error.bind(peliasLogger, __filename));

  return stream;
};

