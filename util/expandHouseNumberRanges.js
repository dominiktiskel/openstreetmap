/**
 * Expands house number ranges and separators into individual numbers.
 * 
 * Handles:
 * - Semicolon separators: "10;12;14" → ["10", "12", "14"]
 * - Slash separators: "10/12" → ["10", "12"]
 * - Comma separators: "10,12" → ["10", "12"]
 * - Numeric ranges: "10-18" → ["10", "12", "14", "16", "18"]
 * - Mixed: "10-14;20" → ["10", "11", "12", "13", "14", "20"]
 * 
 * Range expansion logic:
 * - For small ranges (≤4 numbers): includes ALL numbers
 *   Example: "10-13" → ["10", "11", "12", "13"]
 * - For large ranges (>4 numbers): respects parity (even/odd)
 *   Example: "10-18" → ["10", "12", "14", "16", "18"] (even only)
 *   Example: "11-19" → ["11", "13", "15", "17", "19"] (odd only)
 * 
 * This matches real-world street addressing where even and odd numbers
 * are typically on opposite sides of the street.
 */

const _ = require('lodash');

/**
 * Check if a string is a pure number (possibly with leading zeros)
 */
function isPureNumber(str) {
  return /^\d+$/.test(str);
}

/**
 * Extract numeric and suffix parts from a house number
 * Examples:
 *   "10" → { num: 10, suffix: "" }
 *   "10a" → { num: 10, suffix: "a" }
 *   "10-12" → null (not a single number)
 */
function parseHouseNumber(str) {
  const match = str.match(/^(\d+)([a-zA-Z]*)$/);
  if (!match) return null;
  return {
    num: parseInt(match[1], 10),
    suffix: match[2]
  };
}

/**
 * Expand a numeric range (e.g., "10-18")
 * Returns null if not a valid range
 * 
 * SAFETY: Maximum range size is limited to prevent memory exhaustion
 * from malformed OSM data (e.g., "1-999999999" would crash the importer)
 */
const MAX_RANGE_EXPANSION = 100;  // Maximum numbers to generate from a range

function expandNumericRange(str) {
  const parts = str.split('-');
  if (parts.length !== 2) return null;
  
  const start = parseHouseNumber(parts[0].trim());
  const end = parseHouseNumber(parts[1].trim());
  
  // Both must be valid numbers
  if (!start || !end) return null;
  
  // Start must be less than end
  if (start.num >= end.num) return null;
  
  // Calculate range size
  const rangeSize = end.num - start.num + 1;
  
  // SAFETY: If range is too large, return only boundaries
  // This prevents memory exhaustion from malformed data like "1-169220804"
  if (rangeSize > MAX_RANGE_EXPANSION) {
    // Return just start and end as strings (no expansion)
    const startStr = start.suffix ? `${start.num}${start.suffix}` : String(start.num);
    const endStr = end.suffix ? `${end.num}${end.suffix}` : String(end.num);
    return [startStr, endStr];
  }
  
  // For small ranges (≤4 numbers), include all numbers
  const includeAll = rangeSize <= 5;
  
  const result = [];
  
  // If both have the same suffix, apply it to all numbers
  // Otherwise, only use suffix on start and end
  const useSuffixOnAll = start.suffix === end.suffix && start.suffix !== '';
  
  for (let i = start.num; i <= end.num; i++) {
    // For large ranges, respect parity (even/odd)
    if (!includeAll) {
      const startParity = start.num % 2;
      const currentParity = i % 2;
      if (startParity !== currentParity) {
        continue; // Skip numbers with different parity
      }
    }
    
    // Add suffix logic
    let number = String(i);
    if (useSuffixOnAll) {
      number += start.suffix;
    } else if (i === start.num && start.suffix) {
      number += start.suffix;
    } else if (i === end.num && end.suffix) {
      number += end.suffix;
    }
    
    result.push(number);
  }
  
  return result.length > 0 ? result : null;
}

/**
 * Main function to expand house numbers
 * Handles separators (;, /, ,) and ranges (-)
 */
function expandHouseNumberRanges(value) {
  if (!_.isString(value) || value.trim() === '') {
    return [];
  }
  
  // First, split by semicolons, slashes, and commas
  const parts = value.split(/[;\/,]/).map(p => p.trim()).filter(p => p.length > 0);
  
  const result = [];
  
  for (const part of parts) {
    // Try to expand as a range
    const expanded = expandNumericRange(part);
    
    if (expanded) {
      // It's a valid range, add all expanded numbers
      result.push(...expanded);
    } else {
      // Not a range (or invalid range), add as-is
      result.push(part);
    }
  }
  
  // Remove duplicates while preserving order
  return [...new Set(result)];
}

module.exports = expandHouseNumberRanges;

// Export for testing
module.exports.expandNumericRange = expandNumericRange;
module.exports.parseHouseNumber = parseHouseNumber;

