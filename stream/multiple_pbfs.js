var combinedStream = require('combined-stream');
var pbf = require('./pbf');
var path = require('path');
var through = require('through2');
var logger = require('pelias-logger').get('openstreetmap');

function createCombinedStream(){
  var fullStream = combinedStream.create();
  var defaultPath= require('pelias-config').generate().imports.openstreetmap;

  defaultPath.import.forEach(function( importObject){
    var conf = {
      file: path.join(defaultPath.datapath, importObject.filename),
      leveldb: defaultPath.leveldbpath,
      importVenues: importObject.importVenues,
      importHighwayStreets: importObject.importHighwayStreets || false
    };
    var countryCode = importObject.countryCode || null;
    var importHighwayStreets = importObject.importHighwayStreets || false;

    fullStream.append(function(next){
      logger.info('Creating read stream for: ' + conf.file + (countryCode ? ' [' + countryCode + ']' : '') + (importHighwayStreets ? ' [highway streets]' : ''));
      var parser = pbf.parser(conf);
      if (!countryCode && !importHighwayStreets) {
        return next(parser);
      }
      var tagger = through.obj(function(item, enc, callback) {
        if (countryCode) { item.countryCode = countryCode; }
        item.importHighwayStreets = importHighwayStreets;
        this.push(item);
        callback();
      });
      next(parser.pipe(tagger));
    });
  });

  return fullStream;
}

module.exports.create = createCombinedStream;
