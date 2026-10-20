/* eslint-disable no-console */
/**
 * Seeds the standard 6-offer "Spin & Win" campaign.
 *
 * Usage (from the backend folder):
 *   npm run seed:spinner
 *
 * Safe to run multiple times - an existing campaign is left untouched.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../config/logger');
const { spinnerService } = require('../services');

const run = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  logger.info('Connected to MongoDB');

  const spinner = await spinnerService.createDefaultSpinner();
  logger.info(`Spin & Win campaign ready: ${spinner.name} (${spinner.id})`);

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
