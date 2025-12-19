# Modifications from Upstream Pelias OpenStreetMap

This fork contains custom modifications to prioritize OpenStreetMap administrative data over Who's on First (WOF) data.

## Version: v1.2.0

## Fork Information

- **Upstream**: [pelias/openstreetmap](https://github.com/pelias/openstreetmap)
- **Fork**: [dominiktiskel/openstreetmap](https://github.com/dominiktiskel/openstreetmap)
- **Branch**: `custom`
- **Docker Image**: `tiskel/openstreetmap:v1.2`

## Key Features

### 1. OSM Admin Priority (`preferOsmAdmin`)

**New Configuration Option**: `imports.openstreetmap.preferOsmAdmin`

When enabled (default: `true`), the importer prioritizes administrative data from OSM tags before falling back to WOF.

**Benefits**:
- More accurate local administrative boundaries
- Up-to-date city/state/country information from OSM
- Better handling of recent administrative changes
- WOF still used as fallback for missing fields

### 2. Modified Files

#### `stream/osm_admin_extractor.js` ⭐ NEW FILE

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

**Modified**: Added `osm_admin_extractor` to the import pipeline

```javascript
const osm_admin_extractor = require('./osm_admin_extractor');

// Pipeline order (important!):
// 1. Document construction
// 2. OSM admin extraction ← NEW
// 3. WOF admin lookup (fills gaps)
// 4. Deduplication and finalization
```

#### `schema/address_osm.js`

**Modified**: Enhanced to preserve OSM admin tags in `address_parts`:
- Stores `addr:city` in `address_parts.city`
- Stores `addr:state` in `address_parts.state`
- Stores `addr:country` in `address_parts.country`

These are later extracted by `osm_admin_extractor.js`.

#### `Dockerfile.custom` ⭐ NEW FILE

Custom Dockerfile for building the Docker image with local wof-admin-lookup:
- Based on `pelias/baseimage`
- Includes modified `wof-admin-lookup` module
- Links local wof-admin-lookup into node_modules
- Used to build `tiskel/openstreetmap:v1.2`

#### `test/stream/osm_admin_extractor.js` ⭐ NEW FILE

Comprehensive test coverage for OSM admin extraction:
- Tests enabled/disabled modes
- Tests partial admin data
- Tests complete admin data
- Tests fallback behavior

### 3. Configuration Example

In `pelias.json`:

```json
{
  "imports": {
    "openstreetmap": {
      "preferOsmAdmin": true,
      "download": [...],
      "import": [...]
    }
  }
}
```

Set to `false` to revert to standard WOF-only behavior.

## Workflow Comparison

### Before (Standard Pelias)

```
OSM Data → Document → WOF Admin Lookup → Final Document
                       (only source)
```

### After (Custom with preferOsmAdmin)

```
OSM Data → Document → OSM Admin Extract → WOF Admin Lookup → Final Document
                      (priority)           (fills gaps)
```

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
docker build -f openstreetmap/Dockerfile.custom -t tiskel/openstreetmap:v1.2 .

# Push to Docker Hub
docker push tiskel/openstreetmap:v1.2
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

