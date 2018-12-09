const mongoose = require('mongoose');
const { readdirSync } = require('fs');

const config = require('./config');
const dbLogger = config.logger('db');

// Make sure all models are registered
const modelsDir = config.join('models');
const modelFiles = readdirSync(modelsDir);
for (const modelFile of modelFiles) {
  require(config.join('models', modelFile));
}

// Log database queries in debug mode
if (dbLogger.isLevelEnabled('debug')) {
  mongoose.set('debug', (collection, method, ...args) => dbLogger.debug(`${collection}.${method}(${args.map(arg => JSON.stringify(arg)).join(', ')})`));
}

// Remove deprecation warnings
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);

/**
 * Connects to the database.
 */
async function connect() {
  await mongoose.connect(config.db);
}

module.exports = { connect };
