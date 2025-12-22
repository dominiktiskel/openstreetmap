var categoryDefaults = require('../config/category_map');
var through = require('through2');
var peliasLogger = require('pelias-logger').get('openstreetmap');
var peliasConfig = require('pelias-config').generate();
var _ = require('lodash');

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
streams.houseNumbersCollector = require('./house_numbers_collector');
streams.houseNumbersEnricher = require('./house_numbers_enricher');
streams.streetGenerator = require('./street_generator');
streams.categoryMapper = require('./category_mapper');
streams.addendumMapper = require('./addendum_mapper');
streams.popularityMapper = require('./popularity_mapper');
streams.osmAdminExtractor = require('./osm_admin_extractor');
streams.dbMapper = require('pelias-model').createDocumentMapperStream;
streams.elasticsearch = require('pelias-dbclient');

var aggregateHouseNumbers = _.get(peliasConfig, 'imports.openstreetmap.aggregateHouseNumbers', true);

// Pass 1: Collection phase (writes to LevelDB, discards documents)
streams.importPass1 = function(callback){
  if (!aggregateHouseNumbers) {
    peliasLogger.info('[importPipeline] House numbers aggregation disabled, skipping Pass 1');
    return callback();
  }

  peliasLogger.info('[importPipeline] ========================================');
  peliasLogger.info('[importPipeline] PASS 1: Collecting house numbers to LevelDB');
  peliasLogger.info('[importPipeline] ========================================');

  // Discard stream - drops all documents (we only care about the side-effect of collecting)
  var discardStream = through.obj(function(doc, enc, next) {
    // Drop document silently
    next();
  });

  streams.pbfParser()
    .pipe( streams.docConstructor() )
    .pipe( streams.addressesWithoutStreet() )
    .pipe( streams.tagMapper() )
    .pipe( streams.addressExtractor() )
    .pipe( streams.houseNumbersCollector() )
    .pipe( discardStream )
    .on('finish', function() {
      peliasLogger.info('[importPipeline] Pass 1 complete, starting Pass 2...');
      callback();
    })
    .on('error', function(err) {
      peliasLogger.error('[importPipeline] Pass 1 error:', err);
      callback(err);
    });
};

// Pass 2: Enrichment phase (reads from LevelDB, adds addendum, writes to ES)
streams.importPass2 = function(){
  peliasLogger.info('[importPipeline] ========================================');
  peliasLogger.info('[importPipeline] PASS 2: Enriching addresses and importing to Elasticsearch');
  peliasLogger.info('[importPipeline] ========================================');

  streams.pbfParser()
    .pipe( streams.docConstructor() )
    .pipe( streams.addressesWithoutStreet() )
    .pipe( streams.tagMapper() )
    .pipe( streams.addressExtractor() )
    .pipe( streams.houseNumbersEnricher() )  // Read from LevelDB and add addendum
    .pipe( streams.blacklistStream() )
    .pipe( streams.categoryMapper( categoryDefaults ) )
    .pipe( streams.addendumMapper() )
    .pipe( streams.popularityMapper() )
    .pipe( streams.osmAdminExtractor() )  // Extract admin data from OSM tags before WOF lookup
    .pipe( streams.streetGenerator() )  // Generate street documents from LevelDB (before adminLookup!)
    .pipe( streams.adminLookup() )  // WOF lookup for BOTH addresses AND streets
    .pipe( streams.dbMapper() )
    .pipe( streams.elasticsearch({name: 'openstreetmap'}) );
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
    // Single-pass import without aggregation
    peliasLogger.info('[importPipeline] Running single-pass import (house numbers aggregation disabled)');
    streams.importPass2(); // Pass 2 works fine without enricher if aggregation is disabled
  }
};

module.exports = streams;
