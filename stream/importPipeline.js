var categoryDefaults = require('../config/category_map');

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
streams.houseNumbersAggregator = require('./house_numbers_aggregator');
streams.categoryMapper = require('./category_mapper');
streams.addendumMapper = require('./addendum_mapper');
streams.popularityMapper = require('./popularity_mapper');
streams.osmAdminExtractor = require('./osm_admin_extractor');
streams.dbMapper = require('pelias-model').createDocumentMapperStream;
streams.elasticsearch = require('pelias-dbclient');

// default import pipeline
streams.import = function(){
  streams.pbfParser()
    .pipe( streams.docConstructor() )
    .pipe( streams.addressesWithoutStreet() )
    .pipe( streams.tagMapper() )
    .pipe( streams.addressExtractor() )
    .pipe( streams.houseNumbersAggregator() )  // Aggregate house numbers per street
    .pipe( streams.blacklistStream() )
    .pipe( streams.categoryMapper( categoryDefaults ) )
    .pipe( streams.addendumMapper() )
    .pipe( streams.popularityMapper() )
    .pipe( streams.osmAdminExtractor() )  // Extract admin data from OSM tags before WOF lookup
    .pipe( streams.adminLookup() )
    .pipe( streams.dbMapper() )
    .pipe( streams.elasticsearch({name: 'openstreetmap'}) );
};

module.exports = streams;
