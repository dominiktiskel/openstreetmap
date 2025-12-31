const peliasConfig = require('pelias-config').generate(require('./schema'));
const _ = require('lodash');
const logger = require('pelias-logger').get('openstreetmap');

if (_.has(peliasConfig, 'imports.openstreetmap.adminLookup')) {
  logger.info('imports.openstreetmap.adminLookup has been deprecated, ' +
              'enable adminLookup using imports.adminLookup.enabled = true');
}

// Select pipeline version based on configuration
const useV2Pipeline = _.get(peliasConfig, 'imports.openstreetmap.useV2Pipeline', false);

if (useV2Pipeline) {
  logger.info('Using V2 pipeline (WOF lookup in Pass 1, optimized aggregation)');
  const importPipelineV2 = require('./stream/importPipelineV2');
  importPipelineV2.import();
} else {
  logger.info('Using V1 pipeline (legacy 2-pass with WOF in Pass 2)');
  const importPipeline = require('./stream/importPipeline');
  importPipeline.import();
}
