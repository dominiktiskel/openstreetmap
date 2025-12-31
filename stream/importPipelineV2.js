/**
 * Import Pipeline V2
 * 
 * New architecture with WOF lookup in Pass 1:
 * - Pass 1: OSM PBF → WOF lookup → Split to LevelDB (addresses) / Elasticsearch (POI/venues)
 * - Pass 2: LevelDB → Generate addresses & streets → Elasticsearch
 * 
 * Key improvements:
 * - OSM PBF read only once (vs twice in V1)
 * - WOF lookup in Pass 1 means full hierarchy stored in LevelDB
 * - Pass 2 is simple: just read LevelDB and generate docs
 * - New aggregation key: street|city|lat|lon (0.1° precision)
 * - Country always from WOF ("Polska" not "PL")
 * 
 * @version 1.9.0
 */

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
streams.houseNumbersCollectorV2 = require('./house_numbers_collector_v2');
streams.documentSplitter = require('./document_splitter');
streams.pass2DocumentGenerator = require('./pass2_document_generator');
streams.categoryMapper = require('./category_mapper');
streams.addendumMapper = require('./addendum_mapper');
streams.popularityMapper = require('./popularity_mapper');
streams.dbMapper = require('pelias-model').createDocumentMapperStream;
streams.elasticsearch = require('pelias-dbclient');

var aggregateHouseNumbers = _.get(peliasConfig, 'imports.openstreetmap.aggregateHouseNumbers', true);

// Pass 1: OSM read + WOF lookup + split decision
streams.importPass1 = function(callback){
  if (!aggregateHouseNumbers) {
    peliasLogger.info('[importPipelineV2] House numbers aggregation disabled, skipping Pass 1');
    return callback();
  }

  peliasLogger.info('[importPipelineV2] ========================================');
  peliasLogger.info('[importPipelineV2] PASS 1: Reading OSM + WOF lookup + Split');
  peliasLogger.info('[importPipelineV2] ========================================');

  streams.pbfParser()
    .pipe( streams.docConstructor() )
    .pipe( streams.addressesWithoutStreet() )
    .pipe( streams.tagMapper() )
    .pipe( streams.addressExtractor() )
    .pipe( streams.blacklistStream() )
    .pipe( streams.categoryMapper( categoryDefaults ) )
    .pipe( streams.addendumMapper() )
    .pipe( streams.popularityMapper() )
    .pipe( streams.adminLookup() )  // WOF lookup in Pass 1!
    .pipe( streams.documentSplitter() )  // Split: LevelDB vs direct to Elasticsearch
    .on('finish', function() {
      peliasLogger.info('[importPipelineV2] Pass 1 complete, starting Pass 2...');
      callback();
    })
    .on('error', function(err) {
      peliasLogger.error('[importPipelineV2] Pass 1 error:', err);
      callback(err);
    });
};

// Pass 2: Read LevelDB and generate address + street documents
streams.importPass2 = function(){
  peliasLogger.info('[importPipelineV2] ========================================');
  peliasLogger.info('[importPipelineV2] PASS 2: Generating addresses & streets from LevelDB');
  peliasLogger.info('[importPipelineV2] ========================================');

  // Pass 2: read from LevelDB and generate street docs
  // No OSM PBF parsing, no WOF lookup - everything is already in LevelDB!
  const generator = streams.pass2DocumentGenerator();
  
  // Trigger flush phase by ending the stream immediately
  // (pass2_document_generator works in flush phase, not transform)
  generator.end();
  
  generator
    .pipe( streams.blacklistStream() )
    .pipe( streams.categoryMapper( categoryDefaults ) )
    .pipe( streams.addendumMapper() )
    .pipe( streams.popularityMapper() )
    .pipe( streams.dbMapper() )
    .pipe( streams.elasticsearch({name: 'openstreetmap'}) );
};

// Main import function - orchestrates both passes
streams.import = function(){
  if (aggregateHouseNumbers) {
    // Two-pass import with house numbers aggregation
    streams.importPass1(function(err) {
      if (err) {
        peliasLogger.error('[importPipelineV2] Pass 1 failed:', err);
        process.exit(1);
      }
      // Start Pass 2 after Pass 1 completes
      streams.importPass2();
    });
  } else {
    // Single-pass import without aggregation
    peliasLogger.info('[importPipelineV2] Running single-pass import (house numbers aggregation disabled)');
    streams.importPass2(); // Pass 2 works fine without aggregation
  }
};

module.exports = streams;

