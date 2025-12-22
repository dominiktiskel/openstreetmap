/**
  The house numbers aggregator is responsible for collecting all house numbers
  for each street and adding them as an 'addendum' field to address documents.
  
  This allows searching/querying for all available house numbers on a specific street.
  House numbers are aggregated by street name + full administrative hierarchy
  (locality + region + country) to ensure proper separation.
  
  @see: https://github.com/pelias/api/pull/1255
**/

const through = require('through2');
const peliasLogger = require('pelias-logger').get('openstreetmap');
const peliasConfig = require('pelias-config').generate();
const _ = require('lodash');

/**
 * Natural sort comparison function for house numbers.
 * Handles numeric parts as numbers and alphabetic parts as strings.
 * 
 * Examples:
 *   '1' < '2' < '10' < '22' < '22a' < '22b' < '23' < '100'
 *   '5' < '5A' < '5B' < '7'
 *   '22/1' < '22/2' < '23'
 */
function naturalSort(a, b) {
  // Extract all numeric and non-numeric parts
  const aParts = String(a).match(/(\d+)|(\D+)/g) || [];
  const bParts = String(b).match(/(\d+)|(\D+)/g) || [];
  
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || '';
    const bPart = bParts[i] || '';
    
    // Check if both parts are numeric
    const aIsNum = /^\d+$/.test(aPart);
    const bIsNum = /^\d+$/.test(bPart);
    
    if (aIsNum && bIsNum) {
      // Compare as numbers
      const diff = parseInt(aPart, 10) - parseInt(bPart, 10);
      if (diff !== 0) return diff;
    } else {
      // Compare as strings (case-insensitive)
      const comp = aPart.toLowerCase().localeCompare(bPart.toLowerCase());
      if (comp !== 0) return comp;
    }
  }
  
  return 0;
}

/**
 * Generate a unique key for a street based on its full administrative hierarchy.
 * Format: "street|locality|region|country"
 * 
 * @param {Object} doc - Pelias document
 * @returns {string} - Unique street key
 */
function generateStreetKey(doc) {
  const street = doc.getAddress('street') || '';
  const locality = _.get(doc, 'parent.locality[0]', '');
  const region = _.get(doc, 'parent.region[0]', '');
  const country = _.get(doc, 'parent.country[0]', '');
  
  // Use pipe separator to avoid conflicts with street names containing commas
  return [street, locality, region, country]
    .map(s => String(s).trim().toLowerCase())
    .join('|');
}

module.exports = function() {
  const buffer = [];
  const houseNumbersMap = new Map();
  const enableAggregation = _.get(
    peliasConfig,
    'imports.openstreetmap.aggregateHouseNumbers',
    true
  );

  return through.obj(
    // Transform function - collect documents
    function(doc, enc, next) {
      // If aggregation is disabled, just pass through
      if (!enableAggregation) {
        return next(null, doc);
      }

      try {
        // Only process address documents
        if (doc.getLayer() === 'address') {
          buffer.push(doc);
          
          // Build the aggregation map
          const houseNumber = doc.getAddress('number');
          if (houseNumber) {
            const streetKey = generateStreetKey(doc);
            
            if (!houseNumbersMap.has(streetKey)) {
              houseNumbersMap.set(streetKey, new Set());
            }
            
            // Add house number to the set (automatically handles duplicates)
            houseNumbersMap.get(streetKey).add(String(houseNumber).trim());
          }
        } else {
          // Non-address documents pass through immediately
          this.push(doc);
        }
      } catch (e) {
        peliasLogger.error('house_numbers_aggregator error during collection');
        peliasLogger.error(e.stack);
      }

      return next();
    },
    
    // Flush function - process all buffered documents
    function(done) {
      if (!enableAggregation) {
        return done();
      }

      try {
        peliasLogger.info(
          '[house_numbers_aggregator] Processing %d address documents across %d unique streets',
          buffer.length,
          houseNumbersMap.size
        );

        // Convert sets to sorted CSV strings
        const houseNumbersData = new Map();
        let totalNumbers = 0;
        
        houseNumbersMap.forEach((numbersSet, streetKey) => {
          // Convert Set to Array and sort naturally
          const sortedNumbers = Array.from(numbersSet).sort(naturalSort);
          const csvString = sortedNumbers.join(',');
          houseNumbersData.set(streetKey, csvString);
          totalNumbers += sortedNumbers.length;
        });

        // Log statistics
        if (houseNumbersMap.size > 0) {
          const avgNumbersPerStreet = (totalNumbers / houseNumbersMap.size).toFixed(1);
          peliasLogger.info(
            '[house_numbers_aggregator] Aggregated %d house numbers (avg %s per street)',
            totalNumbers,
            avgNumbersPerStreet
          );
        }

        // Add house_numbers to each document's addendum
        buffer.forEach(doc => {
          try {
            const streetKey = generateStreetKey(doc);
            const houseNumbers = houseNumbersData.get(streetKey);
            
            if (houseNumbers) {
              // Get existing addendum or create new one
              const existingAddendum = doc.getAddendum('osm') || {};
              existingAddendum.house_numbers = houseNumbers;
              doc.setAddendum('osm', existingAddendum);
            }
            
            // Push document downstream
            this.push(doc);
          } catch (e) {
            peliasLogger.error('house_numbers_aggregator error adding addendum');
            peliasLogger.error(e.stack);
            peliasLogger.error(JSON.stringify(doc, null, 2));
            // Still push the document even if addendum fails
            this.push(doc);
          }
        });

        peliasLogger.info(
          '[house_numbers_aggregator] Completed processing %d documents',
          buffer.length
        );
      } catch (e) {
        peliasLogger.error('house_numbers_aggregator error during flush');
        peliasLogger.error(e.stack);
      }

      done();
    }
  );
};

// Export for testing
module.exports.naturalSort = naturalSort;
module.exports.generateStreetKey = generateStreetKey;

