const express = require('express');
const { connectLogger } = require('log4js');
const mongoose = require('mongoose');
const path = require('path');

const apiRouter = require('./api');
const config = require('./config');
const { createError, HttpError } = require('./utils/errors');

const dbLogger = config.logger('db');
if (dbLogger.isLevelEnabled('debug')) {
  mongoose.set('debug', (collection, method, ...args) => dbLogger.debug(`${collection}.${method}(${args.map(arg => JSON.stringify(arg)).join(', ')})`));
}

const expressLogger = config.logger('express');

// Remove deprecation warnings
mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useNewUrlParser', true);

mongoose.connect(config.db);

const app = express();

app.use(connectLogger(expressLogger, { level: 'trace' }));
app.use(express.json());

app.get('/', (req, res) => res.redirect('/api'));
app.use('/api', apiRouter);

app.use((req, res, next) => next(createError(404, 'resourceNotFound', 'No resource found matching the request URI.')));

app.use((err, req, res, next) => {
  console.warn(err.stack);

  res
    .status(getErrorStatusCode(err))
    .set(err.headers || {})
    .send(serializeError(err));
});

module.exports = app;

function getErrorStatusCode(err) {
  if (err.status) {
    return err.status;
  } else if (err.name === 'ValidationError') {
    return 422;
  } else {
    return 500;
  }
}

function serializeError(err) {

  const properties = err.name === 'ValidationError' ? { errors: err.errors } : err.properties;

  return {
    code: err.code || 'unexpected',
    message: err.name === 'ValidationError' || err.expose ? err.message : 'An unexpected error occurred',
    ...properties
  };
}
