
/**
  The OSM admin extractor is responsible for extracting administrative hierarchy
  information from OSM address tags (addr:city, addr:state, addr:country) and
  populating the document's parent fields BEFORE WhosOnFirst admin lookup runs.

  This allows OSM data to take priority over WOF data when available, while
  still using WOF as a fallback for missing fields.

  OSM Tag Mapping:
  - addr:city     -> parent.locality (with ID: osm:locality:cityname)
  - addr:state    -> parent.region   (with ID: osm:region:statename)
  - addr:country  -> parent.country  (with ID: osm:country:countrycode)
  
  IDs are generated in the format: osm:fieldname:value_lowercase
  This ensures uniqueness and allows tracking that data came from OSM.
**/

const through = require('through2');
const _ = require('lodash');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();

// Mapping from OSM address tags to Pelias parent hierarchy fields
// This reads DIRECTLY from OSM tags, not from address_parts
const OSM_TO_PARENT_MAPPING = {
  'addr:city': 'locality',
  'addr:state': 'region',
  'addr:country': 'country'
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
      // Get OSM tags directly from the document
      const tags = doc.getMeta('tags');
      
      if (!tags) {
        // No tags available, skip this document
        return next(null, doc);
      }

      // Track which admin fields were populated from OSM
      const osmAdminFields = [];

      // Process each OSM admin tag and map to parent hierarchy
      _.forOwn(OSM_TO_PARENT_MAPPING, (parentField, osmTag) => {
        const value = _.get(tags, osmTag);
        
        if (value && typeof value === 'string' && value.trim().length > 0) {
          try {
            // Use addParent to set the hierarchy field
            // Note: We generate a simple ID for OSM data (format: osm:locality:value)
            // This ensures uniqueness and allows tracking the source
            const osmId = 'osm:' + parentField + ':' + value.trim().toLowerCase().replace(/\s+/g, '_');
            // abbr is undefined as OSM tags don't typically include abbreviations
            doc.addParent(parentField, value.trim(), osmId, undefined);
            osmAdminFields.push(parentField);
            
            peliasLogger.debug('[osm_admin_extractor] Set parent.' + parentField + ' from OSM tag ' + osmTag, {
              gid: doc.getGid(),
              osmTag: osmTag,
              parentField: parentField,
              value: value.trim()
            });
          }
          catch (err) {
            peliasLogger.warn('[osm_admin_extractor] Failed to add parent field from OSM tag', {
              gid: doc.getGid(),
              osmTag: osmTag,
              parentField: parentField,
              value: value,
              error: err.message
            });
          }
        } else if (value) {
          // Log when tag exists but is invalid
          peliasLogger.debug('[osm_admin_extractor] Skipping invalid OSM tag value', {
            gid: doc.getGid(),
            osmTag: osmTag,
            value: value,
            type: typeof value
          });
        }
      });

      // Mark which fields came from OSM so WOF lookup can skip them
      if (osmAdminFields.length > 0) {
        doc.setMeta('osmAdminFields', osmAdminFields);
        peliasLogger.debug('[osm_admin_extractor] Populated admin fields from OSM tags', {
          gid: doc.getGid(),
          fields: osmAdminFields,
          tags: osmAdminFields.reduce((acc, field) => {
            const osmTag = _.findKey(OSM_TO_PARENT_MAPPING, val => val === field);
            acc[osmTag] = tags[osmTag];
            return acc;
          }, {})
        });
      } else {
        // Log when no OSM admin tags were found
        peliasLogger.debug('[osm_admin_extractor] No OSM admin tags found in document', {
          gid: doc.getGid(),
          availableTags: Object.keys(tags).filter(k => k.startsWith('addr:')).join(', ')
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

