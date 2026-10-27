const peliasConfig = require('pelias-config').generate(require('./schema'));
const _ = require('lodash');
const logger = require('pelias-logger').get('openstreetmap');

if (_.has(peliasConfig, 'imports.openstreetmap.adminLookup')) {
  logger.info('imports.openstreetmap.adminLookup has been deprecated, ' +
              'enable adminLookup using imports.adminLookup.enabled = true');
}

// Re-run only the intersection pass. Pass 1 and 2 stay as they are.
if (process.env.INTERSECTIONS_ONLY === '1') {
  require('./stream/intersections').importFromConfig().then(function(result) {
    logger.info('[intersections] only-mode complete: %s', JSON.stringify(result));
    process.exit(0);
  }).catch(function(err) {
    logger.error('[intersections] only-mode failed:', err);
    process.exit(1);
  });
} else {
  const importPipeline = require('./stream/importPipeline');
  importPipeline.import();
}
