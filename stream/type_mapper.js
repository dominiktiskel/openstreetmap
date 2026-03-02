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
  'en': require('../config/type_map_en'),
  'de': require('../config/type_map_de'),
  'es': require('../config/type_map_es')
};

// Load country to language mapping (fallback — uses WOF country name)
const countryLanguageMap = require('../config/country_language_map');

// ISO 3166-1 alpha-2 country code → language code
// Used as primary language source when countryCode is set in pelias.json import config
const isoLanguageMap = {
  'PL': 'pl',
  'DE': 'de', 'AT': 'de', 'CH': 'de', 'LI': 'de',
  'GB': 'en', 'US': 'en', 'AU': 'en', 'NZ': 'en', 'IE': 'en',
  'CA': 'en', 'ZA': 'en', 'SG': 'en', 'JM': 'en',
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es',
  'PE': 'es', 'VE': 'es', 'EC': 'es', 'BO': 'es', 'PY': 'es',
  'UY': 'es', 'CR': 'es', 'PA': 'es', 'DO': 'es', 'HN': 'es',
  'NI': 'es', 'SV': 'es', 'GT': 'es', 'CU': 'es',
  'FR': 'fr', 'BE': 'fr', 'MC': 'fr', 'LU': 'fr',
  'IT': 'it', 'SM': 'it', 'VA': 'it',
  'PT': 'pt', 'BR': 'pt',
  'NL': 'nl',
  'DK': 'da',
  'NO': 'no',
  'SE': 'sv',
  'FI': 'fi',
  'LT': 'lt',
  'LV': 'lv',
  'EE': 'et',
  'RU': 'ru',
  'UA': 'uk',
  'IL': 'he',
  'TR': 'tr',
  'JP': 'ja',
  'CN': 'zh', 'TW': 'zh',
  'KR': 'ko',
  'KG': 'ky',
};

// Fallback type data for unmapped POI types (language-agnostic)
const FALLBACK_TYPE_DATA = {
  'pl': { type: 'other', type_name: 'Pozostałe', type_aliases: [] },
  'en': { type: 'other', type_name: 'Other', type_aliases: [] },
  'de': { type: 'other', type_name: 'Sonstiges', type_aliases: [] },
  'es': { type: 'other', type_name: 'Otro', type_aliases: [] },
  'fr': { type: 'other', type_name: 'Autre', type_aliases: [] },
  'it': { type: 'other', type_name: 'Altro', type_aliases: [] },
  'pt': { type: 'other', type_name: 'Outro', type_aliases: [] },
  'nl': { type: 'other', type_name: 'Overig', type_aliases: [] },
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

      // Primary: ISO code from import config (set in pelias.json per PBF file)
      const sourceIso = doc.getMeta('source_country_code');
      // Fallback: country name from WOF admin lookup (e.g. "Polska", "Deutschland")
      const country = doc.parent && doc.parent.country && doc.parent.country[0];

      // Determine language code: ISO map first, then WOF country name map, then default
      const languageCode =
        (sourceIso && isoLanguageMap[sourceIso]) ||
        countryLanguageMap[country] ||
        countryLanguageMap._default;

      // Select appropriate type mapping (fallback to English if not available)
      const typeMapping = typeMaps[languageCode] || typeMaps.en;
      
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

