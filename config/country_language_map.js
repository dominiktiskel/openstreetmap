/**
 * Country to Language Code Mapping
 * 
 * Maps country names (as returned by WOF admin lookup) to language codes
 * for selecting the appropriate type_map_*.js file.
 * 
 * The country names should match exactly how they appear in the WOF data
 * after admin lookup populates doc.parent.country[0].
 * 
 * Default: 'en' (English) is used for countries not in this mapping.
 */

module.exports = {
  // Polish-speaking countries
  'Polska': 'pl',
  'Poland': 'pl',
  
  // English-speaking countries
  'United States': 'en',
  'United States of America': 'en',
  'USA': 'en',
  'United Kingdom': 'en',
  'Great Britain': 'en',
  'England': 'en',
  'Scotland': 'en',
  'Wales': 'en',
  'Northern Ireland': 'en',
  'Canada': 'en',
  'Australia': 'en',
  'New Zealand': 'en',
  'Ireland': 'en',
  'South Africa': 'en',
  'India': 'en',
  'Singapore': 'en',
  'Jamaica': 'en',
  'Trinidad and Tobago': 'en',
  'Barbados': 'en',
  'Bahamas': 'en',
  'Malta': 'en',
  
  // German-speaking countries (for future expansion)
  'Germany': 'de',
  'Deutschland': 'de',
  'Austria': 'de',
  'Österreich': 'de',
  'Switzerland': 'de',
  'Schweiz': 'de',
  'Liechtenstein': 'de',
  
  // French-speaking countries (for future expansion)
  'France': 'fr',
  'Belgium': 'fr',
  'Belgique': 'fr',
  'Monaco': 'fr',
  'Luxembourg': 'fr',
  
  // Spanish-speaking countries (for future expansion)
  'Spain': 'es',
  'España': 'es',
  'Mexico': 'es',
  'México': 'es',
  'Argentina': 'es',
  'Colombia': 'es',
  'Chile': 'es',
  'Peru': 'es',
  'Venezuela': 'es',
  'Ecuador': 'es',
  'Guatemala': 'es',
  'Cuba': 'es',
  'Bolivia': 'es',
  'Dominican Republic': 'es',
  'Honduras': 'es',
  'Paraguay': 'es',
  'Nicaragua': 'es',
  'El Salvador': 'es',
  'Costa Rica': 'es',
  'Panama': 'es',
  'Uruguay': 'es',
  
  // Italian-speaking countries (for future expansion)
  'Italy': 'it',
  'Italia': 'it',
  'San Marino': 'it',
  'Vatican City': 'it',
  
  // Portuguese-speaking countries (for future expansion)
  'Portugal': 'pt',
  'Brazil': 'pt',
  'Brasil': 'pt',
  
  // Dutch-speaking countries (for future expansion)
  'Netherlands': 'nl',
  'Nederland': 'nl',
  
  // Czech-speaking countries (for future expansion)
  'Czech Republic': 'cs',
  'Czechia': 'cs',
  'Česko': 'cs',
  
  // Slovak-speaking countries (for future expansion)
  'Slovakia': 'sk',
  'Slovensko': 'sk',
  
  // Other European countries (for future expansion)
  'Russia': 'ru',
  'Россия': 'ru',
  'Ukraine': 'uk',
  'Україна': 'uk',
  'Greece': 'el',
  'Ελλάδα': 'el',
  'Sweden': 'sv',
  'Sverige': 'sv',
  'Norway': 'no',
  'Norge': 'no',
  'Denmark': 'da',
  'Danmark': 'da',
  'Finland': 'fi',
  'Suomi': 'fi',
  'Hungary': 'hu',
  'Magyarország': 'hu',
  'Romania': 'ro',
  'România': 'ro',
  'Bulgaria': 'bg',
  'България': 'bg',
  'Croatia': 'hr',
  'Hrvatska': 'hr',
  'Serbia': 'sr',
  'Србија': 'sr',
  'Lithuania': 'lt',
  'Lietuva': 'lt',
  'Latvia': 'lv',
  'Latvija': 'lv',
  'Estonia': 'et',
  'Eesti': 'et',
  'Slovenia': 'sl',
  'Slovenija': 'sl',
  
  // Asian countries (for future expansion)
  'Japan': 'ja',
  '日本': 'ja',
  'China': 'zh',
  '中国': 'zh',
  'South Korea': 'ko',
  '한국': 'ko',
  'Thailand': 'th',
  'ประเทศไทย': 'th',
  'Vietnam': 'vi',
  'Việt Nam': 'vi',
  'Indonesia': 'id',
  'Malaysia': 'ms',
  'Philippines': 'en', // English is widely used
  'Taiwan': 'zh',
  '臺灣': 'zh',
  
  // Middle Eastern countries (for future expansion)
  'Turkey': 'tr',
  'Türkiye': 'tr',
  'Israel': 'he',
  'ישראל': 'he',
  'Saudi Arabia': 'ar',
  'السعودية': 'ar',
  'United Arab Emirates': 'ar',
  'UAE': 'ar',
  'Egypt': 'ar',
  'مصر': 'ar',
  
  // Default fallback - English
  '_default': 'en'
};
