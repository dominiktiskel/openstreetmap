# Modifications from Upstream Pelias OpenStreetMap

This fork contains custom modifications to prioritize OpenStreetMap administrative data over Who's on First (WOF) data, and to aggregate house numbers for streets.

## Version: v1.3.0

## Fork Information

- **Upstream**: [pelias/openstreetmap](https://github.com/pelias/openstreetmap)
- **Fork**: [dominiktiskel/openstreetmap](https://github.com/dominiktiskel/openstreetmap)
- **Branch**: `custom`
- **Docker Image**: `tiskel/openstreetmap:v1.3`

## Key Features

### 1. House Numbers Aggregation (`aggregateHouseNumbers`)

**New Feature**: Automatic aggregation of house numbers per street in addendum data

When enabled (default: `true`), the importer collects all house numbers for each street and adds them as a comma-separated list in the document's addendum. This allows for quick lookup of all available house numbers on a specific street.

**Benefits**:
- Quick reference to all house numbers on a street
- Support for complex numbering schemes (22, 22a, 22b, 22/1, etc.)
- Natural sorting (1, 2, 10, not 1, 10, 2)
- Proper separation by full administrative hierarchy (street + city + region + country)

**Example Output**:

```json
{
  "address_parts": {
    "number": "22a",
    "street": "Marszałkowska"
  },
  "parent": {
    "locality": "Warszawa",
    "region": "mazowieckie",
    "country": "Polska"
  },
  "addendum": {
    "osm": {
      "house_numbers": "1,3,5,7,9,11,13,15,17,19,21,22,22a,22b,23,25"
    }
  }
}
```

**Configuration**:

In `pelias.json`:

```json
{
  "imports": {
    "openstreetmap": {
      "aggregateHouseNumbers": true
    }
  }
}
```

Set to `false` to disable house number aggregation.

### 2. OSM Admin Priority (`preferOsmAdmin`)

**New Configuration Option**: `imports.openstreetmap.preferOsmAdmin`

When enabled (default: `true`), the importer prioritizes administrative data from OSM tags before falling back to WOF.

**Benefits**:
- More accurate local administrative boundaries
- Up-to-date city/state/country information from OSM
- Better handling of recent administrative changes
- WOF still used as fallback for missing fields

### 3. Modified Files

#### `stream/house_numbers_aggregator.js` ⭐ NEW FILE (v1.3.0)

Complete implementation of house numbers aggregation:
- Buffers all address documents during import
- Aggregates house numbers by street + full admin hierarchy
- Supports numeric (1, 2, 10) and alphanumeric (22a, 22b) formats
- Supports slashes (22/1, 22/2) and ranges (22-24)
- Natural sorting algorithm for proper ordering
- Adds `house_numbers` field to `addendum.osm` for each address
- Configurable via `aggregateHouseNumbers` setting
- Detailed logging of aggregation statistics

**Key Code**:
```javascript
// Natural sorting handles: 1, 2, 10, 22, 22a, 22b, 23, 100
function naturalSort(a, b) {
  const aParts = String(a).match(/(\d+)|(\D+)/g) || [];
  const bParts = String(b).match(/(\d+)|(\D+)/g) || [];
  // Compare numeric parts as numbers, text parts as strings
}

// Street key includes full hierarchy for proper separation
function generateStreetKey(doc) {
  return [street, locality, region, country].join('|');
}
```

#### `stream/osm_admin_extractor.js` ⭐ NEW FILE (v1.2.0)

Complete implementation of OSM admin extraction logic:
- Extracts `addr:city` → `parent.locality`
- Extracts `addr:state` → `parent.region`  
- Extracts `addr:country` → `parent.country`
- Runs BEFORE WOF admin lookup
- Configurable via `preferOsmAdmin` setting
- Detailed logging of extraction process

**Key Code**:
```javascript
const preferOsmAdmin = _.get(peliasConfig, 'imports.openstreetmap.preferOsmAdmin', true);

// Mapping from address_parts to parent hierarchy
const ADMIN_MAPPING = {
  'city': 'locality',
  'state': 'region',
  'country': 'country'
};
```

#### `stream/importPipeline.js`

**Modified**: Added `house_numbers_aggregator` and `osm_admin_extractor` to the import pipeline

```javascript
const house_numbers_aggregator = require('./house_numbers_aggregator');
const osm_admin_extractor = require('./osm_admin_extractor');

// Pipeline order (important!):
// 1. Document construction
// 2. Address extraction
// 3. House numbers aggregation ← NEW (v1.3.0)
// 4. OSM admin extraction ← NEW (v1.2.0)
// 5. WOF admin lookup (fills gaps)
// 6. Deduplication and finalization
```

#### `schema/address_osm.js`

**Modified**: Enhanced to preserve OSM admin tags in `address_parts`:
- Stores `addr:city` in `address_parts.city`
- Stores `addr:state` in `address_parts.state`
- Stores `addr:country` in `address_parts.country`

These are later extracted by `osm_admin_extractor.js`.

#### `Dockerfile.custom` ⭐ NEW FILE (v1.2.0)

Custom Dockerfile for building the Docker image with local wof-admin-lookup:
- Based on `pelias/baseimage`
- Includes modified `wof-admin-lookup` module
- Links local wof-admin-lookup into node_modules
- Used to build `tiskel/openstreetmap:v1.3`

#### `test/stream/house_numbers_aggregator.js` ⭐ NEW FILE (v1.3.0)

Comprehensive test coverage for house numbers aggregation:
- Tests numeric sorting (1, 2, 10, 100)
- Tests alphanumeric sorting (22, 22a, 22b, 23)
- Tests mixed formats (slashes, ranges)
- Tests separation by city/region/country
- Tests duplicate removal
- Tests case insensitivity
- Tests realistic Polish addresses
- Tests missing admin hierarchy handling

#### `test/stream/osm_admin_extractor.js` ⭐ NEW FILE (v1.2.0)

Comprehensive test coverage for OSM admin extraction:
- Tests enabled/disabled modes
- Tests partial admin data
- Tests complete admin data
- Tests fallback behavior

### 4. Configuration Example

In `pelias.json`:

```json
{
  "imports": {
    "openstreetmap": {
      "aggregateHouseNumbers": true,
      "preferOsmAdmin": true,
      "download": [...],
      "import": [...]
    }
  }
}
```

- `aggregateHouseNumbers`: Set to `false` to disable house number aggregation
- `preferOsmAdmin`: Set to `false` to revert to standard WOF-only behavior

## Workflow Comparison

### Before (Standard Pelias)

```
OSM Data → Document → WOF Admin Lookup → Final Document
                       (only source)
```

### After (Custom v1.3.0)

```
OSM Data → Document → Address Extract → House# Aggregate → OSM Admin Extract → WOF Lookup → Final Document
                                        (collect numbers)   (priority)          (fills gaps)
```

Key improvements:
- **House# Aggregate**: Collects all house numbers per street (grouped by full admin hierarchy)
- **OSM Admin Extract**: Prioritizes OSM administrative data over WOF
- **Addendum Data**: Each address document contains aggregated house numbers for its street

## Migration from Upstream

To sync with upstream Pelias:

```bash
# Fetch latest from upstream
git fetch upstream

# Merge into main branch (clean upstream code)
git checkout main
git merge upstream/master

# Merge main into custom branch
git checkout custom
git merge main

# Resolve any conflicts
# Test thoroughly
# Push updates
git push origin custom
```

## Building Docker Image

```bash
# From pelias root directory
cd /path/to/pelias

# Build with both openstreetmap and wof-admin-lookup
docker build -f openstreetmap/Dockerfile.custom -t tiskel/openstreetmap:v1.3 .

# Push to Docker Hub
docker push tiskel/openstreetmap:v1.3
```

## Compatibility

- ✅ Compatible with Pelias API v7.x
- ✅ Compatible with Elasticsearch 7.5+
- ✅ Works with all standard Pelias importers
- ✅ Backward compatible (can disable with `preferOsmAdmin: false`)

## Related Repositories

- [dominiktiskel/wof-admin-lookup](https://github.com/dominiktiskel/wof-admin-lookup) - Modified WOF lookup with OSM priority support
- [dominiktiskel/model](https://github.com/dominiktiskel/model) - Pelias data model
- [dominiktiskel/pelias-docker-custom](https://github.com/dominiktiskel/pelias-docker-custom) - Docker configurations using this custom image

## Changelog

### v1.3.0 (2025-12-22)

- ✨ NEW: House numbers aggregation feature
- ✨ Added `aggregateHouseNumbers` configuration option
- ✨ Implemented `house_numbers_aggregator.js` stream processor
- ✨ Natural sorting algorithm for alphanumeric house numbers
- ✨ Support for complex numbering (22a, 22/1, 22-24, etc.)
- ✨ Aggregation by full administrative hierarchy
- ✨ Added comprehensive test coverage for house numbers
- 📝 Updated documentation with examples

### v1.2.0 (2025-12-19)

- ✨ Initial release of OSM admin priority feature
- ✨ Added `preferOsmAdmin` configuration option
- ✨ Implemented `osm_admin_extractor.js` stream processor
- ✨ Enhanced `address_osm.js` schema
- ✨ Updated import pipeline
- ✨ Added comprehensive test coverage
- ✨ Created custom Dockerfile
- 📝 Complete documentation

## Support

For issues related to these modifications:
- Open issue on [dominiktiskel/openstreetmap](https://github.com/dominiktiskel/openstreetmap/issues)

For upstream Pelias issues:
- See [pelias/openstreetmap](https://github.com/pelias/openstreetmap/issues)

## License

MIT (same as upstream Pelias)

