# Modifications from Upstream Pelias OpenStreetMap

This fork contains custom modifications to prioritize OpenStreetMap administrative data over Who's on First (WOF) data, and to aggregate house numbers for streets using memory-efficient streaming.

## Version: v1.7.0

## Fork Information

- **Upstream**: [pelias/openstreetmap](https://github.com/pelias/openstreetmap)
- **Fork**: [dominiktiskel/openstreetmap](https://github.com/dominiktiskel/openstreetmap)
- **Branch**: `custom`
- **Docker Image**: `tiskel/openstreetmap:v1.7.0`

## Key Features

### 1. Street Documents Import (`importStreets`) ⭐ NEW in v1.6.0

**Feature**: Automatic generation of street-level documents with aggregated house numbers

In addition to importing individual addresses, the importer now creates separate `layer: 'street'` documents for each unique street. Each street document includes:

- **Centroid**: Average coordinates of all addresses on that street
- **House Numbers**: Complete list of all available house numbers
- **Admin Hierarchy**: Locality, region, and country information
- **Unique per locality**: Same street name in different cities = separate documents

**Benefits**:
- ✅ **Street-level search**: Search for "Marszałkowska, Warszawa" returns the street itself
- ✅ **Quick overview**: See all house numbers on a street at a glance
- ✅ **Better UX**: Users can find streets without knowing specific house numbers
- ✅ **No extra cost**: Uses existing LevelDB data, zero additional RAM
- ✅ **Accurate location**: Centroid calculated from real address coordinates

**Example Output**:

```json
{
  "layer": "street",
  "name": "Akacjowa",
  "center_point": { "lat": 51.0440, "lon": 17.0945 },
  "parent": {
    "locality": ["Zacharzyce"],
    "region": ["dolnoslaskie"],
    "country": ["Polska"]
  },
  "addendum": {
    "osm": {
      "house_numbers": "1,2,3,4,5,6,7,8,9,10,..."
    }
  }
}
```

**Configuration**:

```json
{
  "imports": {
    "openstreetmap": {
      "importStreets": true
    }
  }
}
```

### 2. House Numbers Aggregation (`aggregateHouseNumbers`)

**Feature**: Memory-efficient streaming aggregation of house numbers per street using LevelDB

When enabled (default: `true`), the importer uses a two-pass approach to collect and aggregate all house numbers for each street, storing them in the document's addendum. This allows for quick lookup of all available house numbers on a specific street without memory issues.

**Benefits**:
- ✅ **Memory efficient**: Uses LevelDB instead of RAM buffering
- ✅ **Scalable**: Handles unlimited addresses (tested with 30M+ addresses)
- ✅ **Quick reference**: All house numbers on a street in one field
- ✅ **Complex numbering**: Supports 22, 22a, 22b, 22/1, etc.
- ✅ **Natural sorting**: 1, 2, 10 (not 1, 10, 2)
- ✅ **Proper separation**: By full administrative hierarchy (street + city + region + country)

**Implementation** (v1.4.0):
- **Pass 1**: Collects house numbers to LevelDB (streaming, minimal RAM)
- **Pass 2**: Enriches documents with aggregated data from LevelDB

**Performance**:
- Dolny Śląsk (500K addresses): ~200 MB RAM, +15% time
- Poland (5M addresses): ~300 MB RAM, +20% time  
- England (30M addresses): ~500 MB RAM, +25% time ✅ (v1.3 would OOM)

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

### 3. OSM Admin Priority (`preferOsmAdmin`)

**New Configuration Option**: `imports.openstreetmap.preferOsmAdmin`

When enabled (default: `true`), the importer prioritizes administrative data from OSM tags before falling back to WOF.

**Benefits**:
- More accurate local administrative boundaries
- Up-to-date city/state/country information from OSM
- Better handling of recent administrative changes
- WOF still used as fallback for missing fields

### 4. Modified Files

#### `stream/street_generator.js` ⭐ NEW FILE (v1.6.0)

**Street document generation** - creates street-level documents from LevelDB aggregates:
- Runs in flush phase after all addresses processed
- Reads aggregated data from LevelDB
- Calculates average centroid from accumulated coordinates
- Creates `layer: 'street'` documents with house numbers list
- Includes parent hierarchy (locality, region, country)
- Cleans up LevelDB after completion
- Configurable via `imports.openstreetmap.importStreets`

#### `stream/house_numbers_collector.js` (v1.4.0, updated v1.6.0)

**Pass 1** of streaming aggregation - collects house numbers AND coordinates to LevelDB:
- Streams address documents without buffering in RAM
- Writes to LevelDB: `streetKey → { numbers, centroid, locality, region, country }`
- Accumulates coordinates (lat, lon, count) for centroid calculation
- Uses Set for automatic duplicate removal of house numbers
- Natural sorting algorithm applied during collection
- Stores admin data from OSM tags for later use
- Minimal memory footprint (~100-200 MB regardless of dataset size)
- Detailed logging of collection progress
- Backward compatible with v1.5.x array format

**Key Code** (v1.6.0):
```javascript
// LevelDB storage with JSON encoding
const db = new Level(DB_PATH, { valueEncoding: 'json' });

// Collect numbers AND coordinates in streaming fashion
db.get(streetKey, (err, data) => {
  let aggregate = data || {
    numbers: [],
    centroid: { lat: 0, lon: 0, count: 0 },
    locality: '', region: '', country: ''
  };
  
  // Add house number
  const numbersSet = new Set(aggregate.numbers);
  numbersSet.add(houseNumber);
  aggregate.numbers = Array.from(numbersSet).sort(naturalSort);
  
  // Accumulate coordinates
  const centroid = doc.getCentroid();
  aggregate.centroid.lat += centroid.lat;
  aggregate.centroid.lon += centroid.lon;
  aggregate.centroid.count++;
  
  db.put(streetKey, aggregate);
});
```

#### `stream/house_numbers_enricher.js` ⭐ NEW FILE (v1.4.0)

**Pass 2** of streaming aggregation - enriches documents from LevelDB:
- Reads aggregated numbers from LevelDB for each address
- Adds `house_numbers` field to `addendum.osm`
- No memory buffering - processes one document at a time
- Automatic cleanup of LevelDB after import
- Graceful error handling

**Key Code**:
```javascript
// Read from LevelDB and enrich
db.get(streetKey, (err, numbers) => {
  if (!err && numbers.length > 0) {
    const addendum = doc.getAddendum('osm') || {};
    addendum.house_numbers = numbers.join(',');
    doc.setAddendum('osm', addendum);
  }
});
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

**Modified**: Dual-pass pipeline architecture (v1.4.0)

```javascript
const house_numbers_collector = require('./house_numbers_collector');
const house_numbers_enricher = require('./house_numbers_enricher');
const osm_admin_extractor = require('./osm_admin_extractor');

// Two-pass import when aggregateHouseNumbers is enabled:

// Pass 1: Collection (writes to LevelDB, discards documents)
streams.importPass1 = function(callback) {
  streams.pbfParser()
    .pipe(streams.addressExtractor())
    .pipe(streams.houseNumbersCollector()) // ← Collect to LevelDB
    .pipe(discardStream) // ← Drop documents
    .on('finish', callback);
};

// Pass 2: Enrichment (reads from LevelDB, imports to ES)
streams.importPass2 = function() {
  streams.pbfParser()
    .pipe(streams.addressExtractor())
    .pipe(streams.houseNumbersEnricher()) // ← Read from LevelDB
    .pipe(streams.osmAdminExtractor())
    .pipe(streams.adminLookup())
    .pipe(streams.elasticsearch());
};
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

#### `test/stream/house_numbers_streaming.js` ⭐ NEW FILE (v1.4.0)

Comprehensive test coverage for streaming aggregation:
- Tests natural sort function (numeric, alphanumeric, mixed)
- Tests generateStreetKey function
- **Integration tests**: Full Pass 1 + Pass 2 workflow
- Tests separation by city/region/country
- Tests duplicate removal
- Tests alphanumeric formats (22a, 22b, 22/1)
- Tests realistic Polish addresses (Marszałkowska, Warszawa)
- Tests venue documents (should not be enriched)
- Automatic LevelDB cleanup after tests

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

### After (Custom v1.4.0)

**Two-Pass Architecture with Streaming:**

```
PASS 1: OSM Data → Document → Address Extract → House# Collector → LevelDB
                                                  (stream to disk)   (temp storage)

PASS 2: OSM Data → Document → Address Extract → House# Enricher → OSM Admin → WOF → Elasticsearch
                                                  (read from disk)   (priority)   (fills gaps)
```

Key improvements:
- **Pass 1**: Streaming collection to LevelDB (minimal RAM usage)
- **Pass 2**: Enrichment from LevelDB + normal import pipeline
- **House# Collector**: Streams to disk instead of buffering in RAM
- **House# Enricher**: Reads aggregated data and adds to addendum
- **OSM Admin Extract**: Prioritizes OSM administrative data over WOF
- **Memory Efficiency**: Handles 30M+ addresses with <500 MB RAM

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
docker build -f openstreetmap/Dockerfile.custom -t tiskel/openstreetmap:v1.4.1 .

# Push to Docker Hub
docker push tiskel/openstreetmap:v1.4.1
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

### v1.7.0 (2025-12-22)

**⚠️ BREAKING CHANGE: Geographic-based street key aggregation**

- 🔄 **BREAKING**: Street aggregation key changed from `street|locality|region|country` to `street|locality|lat|lon`
- 📍 **NEW**: Uses coordinates rounded to 1 decimal place (~11km precision) for geographic uniqueness
- ✅ **FIX**: Streets with same name in different locations now properly separated even when OSM lacks `addr:state`
- ⭐ **FIX**: Street documents now get full WOF hierarchy (region, county, country, localadmin)
- 🔧 **CHANGE**: Moved `streetGenerator` before `adminLookup` in pipeline
- 🗑️ **REMOVED**: `region` and `country` fields from LevelDB aggregate (WOF provides full hierarchy)
- 🧪 **UPDATED**: All tests updated for new key format
- ♻️ **COMPATIBLE**: Automatically handles old v1.6.x data format during migration

**Root Cause:**

Previous key format relied on `addr:state` and `addr:country` OSM tags which are often missing. This caused streets with the same name in different places to be merged incorrectly:
- Key: `"akacjowa|zacharzyce||"` (two empty fields = ambiguous!)
- Result: All "Akacjowa, Zacharzyce" streets combined regardless of location

**New Solution:**

Geographic coordinates are ALWAYS available and provide reliable separation:
- Key: `"akacjowa|zacharzyce|51.0|17.1"` (unique per location!)
- Precision: 0.1° ≈ 11km (perfect for distinguishing different towns/districts)

**Before (v1.6.2):**
```json
{
  "id": "street_akacjowa_zacharzyce__",
  "name": "Akacjowa",
  "locality": "Zacharzyce",
  "label": "Akacjowa, Zacharzyce"
  // Missing: region, county, country (no WOF hierarchy)
}
```

**After (v1.7.0):**
```json
{
  "id": "street_akacjowa_zacharzyce_51.0_17.1",
  "name": "Akacjowa",
  "locality": "Zacharzyce",
  "region": "dolnośląskie",
  "county": "Trzebnicki",
  "country": "Polska",
  "country_code": "PL",
  "label": "Akacjowa, Zacharzyce, DS, Polska"
  // Full WOF hierarchy included! ✅
}
```

**LevelDB Structure Change:**

Key format:
```
BEFORE: "akacjowa|zacharzyce||" 
AFTER:  "akacjowa|zacharzyce|51.0|17.1"
```

Value structure:
```json
{
  "numbers": ["1", "2", "3"],
  "centroid": { "lat": 153.0, "lon": 51.1, "count": 3 },
  "streetName": "Akacjowa",
  "locality": "Zacharzyce"
  // REMOVED: region, country (WOF will provide)
}
```

**Pipeline Change:**

```javascript
// BEFORE (v1.6.2):
.pipe( osmAdminExtractor() )
.pipe( adminLookup() )         // WOF only for addresses
.pipe( streetGenerator() )     // Streets miss WOF ❌
.pipe( dbMapper() )

// AFTER (v1.7.0):
.pipe( osmAdminExtractor() )
.pipe( streetGenerator() )     // Generate streets early
.pipe( adminLookup() )         // WOF for addresses + streets ✅
.pipe( dbMapper() )
```

**Migration Required:**

⚠️ This is a **BREAKING CHANGE** - full reimport required:

```bash
pelias compose pull openstreetmap
pelias compose down
pelias elastic drop
pelias elastic create
pelias import osm
```

**Benefits:**
- ✅ Reliable geographic separation (coordinates always available)
- ✅ Streets get full WOF admin hierarchy (same as addresses)
- ✅ Simpler data model (no manual admin field management)
- ✅ Works correctly even with incomplete OSM tagging
- ✅ ~11km precision perfect for Poland's administrative divisions

### v1.6.2 (2025-12-22)

**🐛 FIX: Street names now preserve original capitalization**

- 🐛 **FIXED**: Street document names now use original capitalization (e.g., "Akacjowa" instead of "akacjowa")
- ✨ LevelDB aggregate now stores `streetName` field with original capitalization
- 🔧 Backward compatible: Falls back to key parsing for old data
- 📝 Improved street document quality and searchability

**Root cause**: Street names were taken from LevelDB key which is lowercase (`generateStreetKey()` converts to lowercase for deduplication).

**Solution**: Store original street name in aggregate structure:
```javascript
aggregate = {
  numbers: [...],
  centroid: { lat: 0, lon: 0, count: 0 },
  streetName: "Akacjowa",  // Original capitalization
  locality: "Zacharzyce",
  region: "dolnoslaskie",
  country: "PL"
}
```

**Before (v1.6.1):**
```json
{
  "name": "akacjowa",
  "label": "akacjowa, Bielany Wrocławskie"
}
```

**After (v1.6.2):**
```json
{
  "name": "Akacjowa",
  "label": "Akacjowa, Bielany Wrocławskie"
}
```

### v1.6.1 (2025-12-22)

**🐛 HOTFIX: Fixed LevelDB iterator API for street generation**

- 🐛 **FIXED**: Changed `db.createReadStream()` to async iterator API for level v8.x compatibility
- ✨ Street generator now uses `for await (const [key, value] of db.iterator())`
- 🔧 Proper async/await error handling for database operations
- ✅ Compatible with `level` package v8.x API

**Root cause**: In `level` v8.x, the `createReadStream()` method was removed. The new API uses async iterators.

**Solution**: Replaced stream-based reading with async iteration:
```javascript
// Before (v1.6.0) - doesn't work with level v8.x
const stream = db.createReadStream();
stream.on('data', ({ key, value }) => { ... });

// After (v1.6.1) - correct level v8.x API
for await (const [key, value] of db.iterator()) { ... }
```

### v1.6.0 (2025-12-22)

**✨ NEW FEATURE: Street Documents Import**

- ✨ **NEW**: Importer now generates `layer: 'street'` documents in addition to address documents
- 📍 **Centroid Calculation**: Each street gets a centroid calculated as average of all address coordinates
- 🏘️ **Admin Hierarchy**: Streets inherit locality/region/country from their addresses
- 📊 **House Numbers List**: Streets include all available house numbers in addendum
- 🔧 **Configurable**: Can be disabled with `imports.openstreetmap.importStreets: false`
- 💾 **Zero Extra RAM**: Uses existing LevelDB infrastructure, no additional memory needed
- ⚡ **Flush Phase**: Streets generated after all addresses processed, minimal performance impact

**New Files**:
- `stream/street_generator.js` - Generates street documents from LevelDB aggregates
- `test/stream/street_generator.js` - Comprehensive test suite

**Modified Files**:
- `stream/house_numbers_collector.js` - Extended to accumulate coordinates and admin data
- `stream/house_numbers_enricher.js` - Updated for new LevelDB structure (backward compatible)
- `stream/importPipeline.js` - Integrated street_generator into Pass 2

**LevelDB Structure Change**:

Before (v1.5.x):
```json
["1", "2", "3", "10", "22a"]
```

After (v1.7.0):
```json
{
  "numbers": ["1", "2", "3", "10", "22a"],
  "centroid": {
    "lat": 51.0440,
    "lon": 17.0945,
    "count": 5
  },
  "streetName": "Akacjowa",
  "locality": "Zacharzyce"
}
```

Note: `region` and `country` removed - WOF lookup provides full admin hierarchy.

**Example Street Document**:

```json
{
  "layer": "street",
  "source": "openstreetmap",
  "name": {
    "default": "Akacjowa"
  },
  "center_point": {
    "lat": 51.0440,
    "lon": 17.0945
  },
  "parent": {
    "locality": ["Zacharzyce"],
    "region": ["dolnoslaskie"],
    "country": ["Polska"]
  },
  "addendum": {
    "osm": {
      "house_numbers": "1,2,3,4,5,6,7,8,9,10,..."
    }
  }
}
```

**API Usage**:

Search for streets:
```
GET /v1/search?text=Akacjowa, Zacharzyce&layers=street
GET /v1/autocomplete?text=Akacjowa&layers=street,address
```

**Configuration**:

```json
{
  "imports": {
    "openstreetmap": {
      "aggregateHouseNumbers": true,
      "importStreets": true
    }
  }
}
```

**Migration Notes**:
- Fully backward compatible with v1.5.x
- Old LevelDB data automatically migrated to new format
- Both array and object formats supported during transition
- Recommended: Fresh import for optimal street document generation

### v1.5.2 (2025-12-22)

**🐛 CRITICAL FIX: House numbers now grouped correctly by locality**

- 🐛 **FIXED**: House numbers aggregation now uses OSM tags (`addr:city`, `addr:state`, `addr:country`) instead of `parent` hierarchy
- ✨ Streets with the same name in different localities now have separate house number lists
- 🔍 **Root cause**: In Pass 1, `parent.locality/region/country` are empty (added by WOF lookup in Pass 2), so all streets with same name were grouped together
- 🎯 **Solution**: Read directly from `doc.getMeta('tags')` which contains raw OSM data available immediately
- 🧪 Updated tests to set both OSM tags and parent hierarchy
- 📝 Added detailed comments explaining the logic

**Example fix**:
- **Before**: All "Akacjowa" streets in entire region shared the same 150+ house numbers
- **After**: "Akacjowa" in Zacharzyce, Ślęza, Radwanice each have their own correct house numbers

**Technical details**:
- `generateStreetKey()` now reads: `tags['addr:city']` first, falls back to `parent.locality[0]`
- Works in both Pass 1 (collection) and Pass 2 (enrichment)
- Maintains consistency between LevelDB key generation and lookup

### v1.5.1 (2025-12-22)

**🐛 HOTFIX: Fixed addParent null ID error**

- 🐛 **FIXED**: Changed `addParent(field, value, null, null)` to use generated IDs
- ✨ OSM admin IDs now generated in format: `osm:locality:cityname`
- 🧪 Added tests to verify ID generation
- 📝 Updated documentation with ID format

**Root cause**: `pelias-model` requires `id` parameter to be a string, not `null`. The error `invalid document type, expecting: string got: null` occurred because we passed `null` for the `id` parameter.

**Solution**: Generate unique IDs in format `osm:fieldname:value_lowercase` (e.g., `osm:locality:zacharzyce`)

### v1.5.0 (2025-12-22)

**🐛 CRITICAL FIX: OSM admin priority now works correctly**

- 🐛 **FIXED**: `osm_admin_extractor.js` now reads directly from OSM tags instead of `address_parts`
- ✨ Addresses with `addr:city=Zacharzyce` now correctly use OSM data instead of WOF
- ✨ Enhanced debug logging for troubleshooting admin data extraction
- 🧪 Updated all tests to use OSM tags API (`setMeta('tags', ...)`)
- 📝 Confirmed documentation is accurate
- ⚠️ **Breaking**: Tests now require OSM tags to be set via `setMeta('tags')` not `address_parts`

**Root cause**: `addr:city`, `addr:state`, `addr:country` were never added to `address_parts` (they are commented out in `address_karlsruhe.js`), so the extractor was reading from an empty object.

**Solution**: Changed `osm_admin_extractor.js` to read directly from `doc.getMeta('tags')` which contains the raw OSM tags.

### v1.4.1 (2025-12-22)

- 🐛 **HOTFIX**: Fixed `level` package import for v8.x
- 🔧 Changed from `level()` to `new Level()` constructor
- 🔧 Changed import from `require('level')` to `require('level').Level`
- ✅ Tested and working with level@8.0.0

### v1.4.0 (2025-12-22)

- ✨ **MAJOR**: Refactored to LevelDB-based streaming aggregation
- 🚀 **Performance**: Memory-efficient two-pass architecture
- ✅ **Scalability**: Tested with 30M+ addresses (England import)
- 📉 **Memory**: ~200-500 MB RAM (was 40+ GB in v1.3.0)
- ⏱️ **Speed**: ~20-25% slower but no OOM errors
- 🔧 Added `level` package dependency
- 📁 New files: `house_numbers_collector.js`, `house_numbers_enricher.js`
- 🗑️ Removed: `house_numbers_aggregator.js` (RAM-based version)
- 🧪 New tests: `house_numbers_streaming.js` with integration tests
- 📝 Updated documentation with performance characteristics
- 🐛 Fixed: Memory issues for large imports (>10M addresses)

### v1.3.0 (2025-12-22)

- ✨ NEW: House numbers aggregation feature
- ✨ Added `aggregateHouseNumbers` configuration option
- ✨ Implemented `house_numbers_aggregator.js` stream processor
- ✨ Natural sorting algorithm for alphanumeric house numbers
- ✨ Support for complex numbering (22a, 22/1, 22-24, etc.)
- ✨ Aggregation by full administrative hierarchy
- ✨ Added comprehensive test coverage for house numbers
- 📝 Updated documentation with examples
- ⚠️ **Deprecated**: RAM-based approach (replaced in v1.4.0)

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

