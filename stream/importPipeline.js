/**
 * Import Pipeline - Two-Pass Architecture
 *
 * Architecture:
 * - Pass 1: OSM PBF → WOF lookup → LevelDB (addresses + venues)
 * - Pass 2: LevelDB → Generate documents → Elasticsearch
 *
 * Key features:
 * - OSM PBF read only once
 * - WOF lookup in Pass 1 → full hierarchy stored in LevelDB
 * - Pass 2 generates: streets, addresses, and venues
 * - Aggregation key: street|city|lat|lon (0.1° precision)
 * - Country always from WOF ("Polska" not "PL")
 * - Stale LevelDB databases removed before Pass 1 (failed runs can't leak data)
 * - Single-pass mode (aggregateHouseNumbers=false) imports directly to Elasticsearch
 *
 * @version 2.10.0
 */

var categoryDefaults = require('../config/category_map');
var fs = require('fs');
var { pipeline } = require('stream');
var peliasLogger = require('pelias-logger').get('openstreetmap');
var peliasConfig = require('pelias-config').generate();
var _ = require('lodash');
var { ALL_DB_PATHS } = require('../util/leveldb_paths');

var streams = {};

streams.config = {
  categoryDefaults: categoryDefaults
};

streams.pbfParser = require('./multiple_pbfs').create;
streams.docConstructor = require('./document_constructor');
streams.blacklistStream = require('pelias-blacklist-stream');
streams.tagMapper = require('./tag_mapper');
streams.addressesWithoutStreet = require('./addresses_without_street');
streams.adminLookup = require('pelias-wof-admin-lookup').create;
streams.addressExtractor = require('./address_extractor');
streams.localityExtractor = require('./locality_extractor');
streams.streetExtractor = require('./street_extractor');
streams.houseNumbersCollector = require('./house_numbers_collector');
streams.documentSplitter = require('./document_splitter');
streams.pass2DocumentGenerator = require('./pass2_document_generator');
streams.categoryMapper = require('./category_mapper');
streams.typeMapper = require('./type_mapper');
streams.addendumMapper = require('./addendum_mapper');
streams.popularityMapper = require('./popularity_mapper');
streams.dbMapper = require('pelias-model').createDocumentMapperStream;
streams.elasticsearch = require('pelias-dbclient');

var aggregateHouseNumbers = _.get(peliasConfig, 'imports.openstreetmap.aggregateHouseNumbers', true);

// Remove stale LevelDB databases from a previous (possibly failed) run.
// Pass 1 collectors MERGE into existing databases, so leftovers from an
// aborted import would otherwise leak into the new one.
function cleanStaleLevelDbs() {
  ALL_DB_PATHS.forEach(function(dbPath) {
    try {
      if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { recursive: true, force: true });
        peliasLogger.info('[importPipeline] Removed stale LevelDB: %s', dbPath);
      }
    } catch (err) {
      peliasLogger.error('[importPipeline] Failed to remove stale LevelDB %s: %s', dbPath, err.message);
    }
  });
}

// Pass 1: OSM read + WOF lookup + split decision
streams.importPass1 = function(callback){
  peliasLogger.info('[importPipeline] ========================================');
  peliasLogger.info('[importPipeline] PASS 1: Reading OSM + WOF lookup + Split');
  peliasLogger.info('[importPipeline] ========================================');

  cleanStaleLevelDbs();

  streams.pbfParser()
    .pipe( streams.docConstructor() )
    .pipe( streams.addressesWithoutStreet() )
    .pipe( streams.tagMapper() )
    .pipe( streams.addressExtractor() )
    .pipe( streams.localityExtractor() )
    .pipe( streams.streetExtractor() )
    .pipe( streams.blacklistStream() )
    .pipe( streams.adminLookup() )  // WOF lookup in Pass 1! (BEFORE typeMapper)
    .pipe( streams.categoryMapper( categoryDefaults ) )
    .pipe( streams.popularityMapper() )
    .pipe( streams.typeMapper() )  // Now runs AFTER adminLookup - can access country field
    .pipe( streams.addendumMapper() )
    .pipe( streams.documentSplitter() )  // Split: LevelDB vs direct to Elasticsearch
    .on('finish', function() {
      // Collectors have already signalled 'closed' (document_splitter waits
      // for them) and Pass 2 retries LEVEL_LOCKED with backoff, so no
      // additional fixed delay is needed here.
      peliasLogger.info('[importPipeline] Pass 1 complete, starting Pass 2...');
      callback();
    })
    .on('error', function(err) {
      peliasLogger.error('[importPipeline] Pass 1 error:', err);
      callback(err);
    });
};

// Pass 2: Read LevelDB and generate documents for Elasticsearch
streams.importPass2 = function(){
  peliasLogger.info('[importPipeline] ========================================');
  peliasLogger.info('[importPipeline] PASS 2: Generating documents from LevelDB');
  peliasLogger.info('[importPipeline] ========================================');

  // pass2DocumentGenerator returns a Readable (async generator) -
  // backpressure is handled natively by the stream machinery.
  pipeline(
    streams.pass2DocumentGenerator(),
    streams.blacklistStream(),
    streams.categoryMapper( categoryDefaults ),
    streams.addendumMapper(),
    streams.popularityMapper(),
    streams.dbMapper(),
    streams.elasticsearch({name: 'openstreetmap'}),
    function(err) {
      if (err) {
        peliasLogger.error('[importPipeline] Pass 2 failed:', err);
        process.exitCode = 1;
      } else {
        peliasLogger.info('[importPipeline] Pass 2 complete - all documents sent to Elasticsearch');
      }
    }
  );
};

// Single-pass import (aggregateHouseNumbers=false):
// same streams as Pass 1, but documents go straight to Elasticsearch
// instead of being collected into LevelDB.
streams.importSinglePass = function(){
  peliasLogger.info('[importPipeline] ========================================');
  peliasLogger.info('[importPipeline] SINGLE PASS: OSM → WOF lookup → Elasticsearch');
  peliasLogger.info('[importPipeline] (house numbers aggregation disabled)');
  peliasLogger.info('[importPipeline] ========================================');

  pipeline(
    streams.pbfParser(),
    streams.docConstructor(),
    streams.addressesWithoutStreet(),
    streams.tagMapper(),
    streams.addressExtractor(),
    streams.localityExtractor(),
    streams.streetExtractor(),
    streams.blacklistStream(),
    streams.adminLookup(),
    streams.categoryMapper( categoryDefaults ),
    streams.popularityMapper(),
    streams.typeMapper(),
    streams.addendumMapper(),
    streams.dbMapper(),
    streams.elasticsearch({name: 'openstreetmap'}),
    function(err) {
      if (err) {
        peliasLogger.error('[importPipeline] Single-pass import failed:', err);
        process.exitCode = 1;
      } else {
        peliasLogger.info('[importPipeline] Single-pass import complete');
      }
    }
  );
};

// Main import function - orchestrates both passes
streams.import = function(){
  if (aggregateHouseNumbers) {
    // Two-pass import with house numbers aggregation
    streams.importPass1(function(err) {
      if (err) {
        peliasLogger.error('[importPipeline] Pass 1 failed:', err);
        process.exit(1);
      }
      // Start Pass 2 after Pass 1 completes
      streams.importPass2();
    });
  } else {
    // Single-pass import without aggregation - documents flow directly to ES
    streams.importSinglePass();
  }
};

module.exports = streams;
