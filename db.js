const mongoose = require('mongoose');

const config = require('./config');
const dbLogger = config.logger('db');

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
