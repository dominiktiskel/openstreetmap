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
      importVenues: importObject.importVenues
    };
    var countryCode = importObject.countryCode || null;

    fullStream.append(function(next){
      logger.info('Creating read stream for: ' + conf.file + (countryCode ? ' [' + countryCode + ']' : ''));
      var parser = pbf.parser(conf);
      if (!countryCode) {
        return next(parser);
      }
      var tagger = through.obj(function(item, enc, callback) {
        item.countryCode = countryCode;
        this.push(item);
        callback();
      });
      next(parser.pipe(tagger));
    });
  });

  return fullStream;
}

module.exports.create = createCombinedStream;
