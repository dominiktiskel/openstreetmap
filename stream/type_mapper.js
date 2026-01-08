/**
 * Type Mapper - assigns POI type and type_name based on OSM tags
 * Similar to category_mapper but for single type assignment
 * 
 * Stores type information in document metadata for later persistence to LevelDB
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');

module.exports = function(typeMapping) {
  return through.obj(function(doc, enc, next) {
    try {
      // Only map venues (not addresses, localities, streets)
      if (doc.getLayer() !== 'venue') {
        return next(null, doc);
      }

      // Get OSM tags
      const tags = doc.getMeta('tags');
      if (!tags) {
        return next(null, doc);
      }

      // Find first matching type (priority order matters)
      // Priority: amenity > highway > public_transport > shop > tourism > leisure > building
      let typeData = null;
      
      const priorityKeys = [
        'amenity',
        'highway', 
        'public_transport',
        'shop',
        'tourism',
        'leisure',
        'building'
      ];
      
      for (const osmKey of priorityKeys) {
        if (tags[osmKey] && typeMapping[osmKey] && typeMapping[osmKey][tags[osmKey]]) {
          typeData = typeMapping[osmKey][tags[osmKey]];
          break;  // Use first match only (1:1 mapping)
        }
      }

      // Store type and type_name in document metadata
      // These will be saved to LevelDB by venue_collector and restored in Pass 2
      if (typeData) {
        doc.setMeta('osm_type', typeData.type);
        doc.setMeta('osm_type_name_pl', typeData.type_name_pl);
        
        // Store type aliases if available
        if (typeData.type_aliases_pl && Array.isArray(typeData.type_aliases_pl)) {
          doc.setMeta('osm_type_aliases_pl', typeData.type_aliases_pl);
        }
      }

    } catch(e) {
      peliasLogger.error('[type_mapper] error');
      peliasLogger.error(e.stack);
      peliasLogger.error(JSON.stringify(doc, null, 2));
    }

    return next(null, doc);
  });
};

