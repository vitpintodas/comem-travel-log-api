const cors = require('cors');
const express = require('express');
const { connectLogger } = require('log4js');

// Load database first to make sure all models are registered
const db = require('./db');

const apiRouter = require('./api');
const config = require('./config');

const app = express();
const expressLogger = config.logger('express');

// Log HTTP requests
app.use(connectLogger(expressLogger, { level: 'trace' }));

// Parse the body of JSON requests
app.use(express.json());

// Allow CORS (if enabled)
if (config.cors) {
  app.use(cors({
    exposedHeaders: [
      'Pagination-Page',
      'Pagination-Page-Size',
      'Pagination-Total',
      'Pagination-Filtered-Total'
    ]
  }));
  expressLogger.debug('CORS is enabled');
} else {
  expressLogger.debug('CORS is disabled');
}

// Plug in the API
app.use('/api', apiRouter);

// Display the documentation if available
app.use(express.static('docs'));

// Redirect root requests to the API
app.use('/', (req, res) => res.redirect('/api'));

/**
 * Starts the application by connecting to the database.
 */
app.start = async function start() {
  await db.connect();
};

module.exports = app;
