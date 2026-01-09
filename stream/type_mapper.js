/**
 * Type Mapper - assigns POI type and type_name based on OSM tags
 * Multi-language support: selects appropriate language based on document country
 * 
 * Stores type information in document metadata for later persistence to LevelDB
 */

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');

// Load all type maps at module initialization (cached)
const typeMaps = {
  'pl': require('../config/type_map_pl'),
  'en': require('../config/type_map_en')
  // Add more languages as needed: 'de', 'fr', 'es', etc.
};

// Load country to language mapping
const countryLanguageMap = require('../config/country_language_map');

// Fallback type data for unmapped POI types (language-agnostic)
const FALLBACK_TYPE_DATA = {
  'pl': { type: 'other', type_name: 'Pozostałe', type_aliases: [] },
  'en': { type: 'other', type_name: 'Other', type_aliases: [] }
};

module.exports = function() {
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

      // Get country from document (populated by adminLookup)
      // Note: adminLookup must run BEFORE typeMapper in the pipeline
      const country = doc.parent && doc.parent.country && doc.parent.country[0];
      
      // Determine language code based on country
      const languageCode = countryLanguageMap[country] || countryLanguageMap._default;
      
      // Select appropriate type mapping (fallback to English if not available)
      const typeMapping = typeMaps[languageCode] || typeMaps.en;
      
      // Log language selection at debug level for verification
      if (country) {
        peliasLogger.debug('[type_mapper] Country: %s, Language: %s', country, languageCode);
      } else {
        peliasLogger.debug('[type_mapper] No country found, using default language: %s', languageCode);
      }

      // Find first matching type (priority order matters)
      // Priority: aeroway > amenity > highway > public_transport > shop > tourism > leisure > building
      let typeData = null;
      
      const priorityKeys = [
        'aeroway',
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

      // CUSTOM: Fallback for unmapped types - use generic "other" type with language-specific name
      if (!typeData) {
        // Find first OSM tag that could represent a type
        for (const osmKey of priorityKeys) {
          if (tags[osmKey]) {
            typeData = FALLBACK_TYPE_DATA[languageCode] || FALLBACK_TYPE_DATA.en;
            break;
          }
        }
      }

      // Store type and type_name in document metadata
      // These will be saved to LevelDB by venue_collector and restored in Pass 2
      if (typeData) {
        doc.setMeta('osm_type', typeData.type);
        doc.setMeta('osm_type_name', typeData.type_name);
        
        // Store type aliases if available
        if (typeData.type_aliases && Array.isArray(typeData.type_aliases)) {
          doc.setMeta('osm_type_aliases', typeData.type_aliases);
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

