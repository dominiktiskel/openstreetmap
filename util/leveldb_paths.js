/**
 * Shared LevelDB paths for the two-pass import pipeline.
 *
 * Single source of truth for the database locations used by:
 * - stream/house_numbers_collector.js (writes streets aggregation)
 * - stream/venue_collector.js (writes venues)
 * - stream/locality_collector.js (writes localities)
 * - stream/pass2_document_generator.js (reads all three)
 * - stream/importPipeline.js (cleans them up before Pass 1)
 */

const path = require('path');
const _ = require('lodash');
const peliasConfig = require('pelias-config').generate();

const LEVELDB_PATH_BASE = _.get(
  peliasConfig,
  'imports.openstreetmap.leveldbpath',
  require('os').tmpdir()
);

const STREETS_DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-house-numbers-aggregation-v2');
const VENUES_DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-venues-v2');
const LOCALITIES_DB_PATH = path.join(LEVELDB_PATH_BASE, 'pelias-localities');

module.exports = {
  LEVELDB_PATH_BASE,
  STREETS_DB_PATH,
  VENUES_DB_PATH,
  LOCALITIES_DB_PATH,
  ALL_DB_PATHS: [STREETS_DB_PATH, VENUES_DB_PATH, LOCALITIES_DB_PATH]
};
