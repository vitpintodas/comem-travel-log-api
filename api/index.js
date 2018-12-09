const express = require('express');

const config = require('../config');
const { createError } = require('../utils/errors');
const authRoutes = require('./auth/auth.routes');
const placesRoutes = require('./places/places.routes');
const tripsRoutes = require('./trips/trips.routes');
const usersRoutes = require('./users/users.routes');

const apiLogger = config.logger('api');
const router = express.Router();

// GET /api
router.get('/', (req, res) => res.send({ version: config.version }));

// API resources
router.use('/auth', authRoutes);
router.use('/places', placesRoutes);
router.use('/trips', tripsRoutes);
router.use('/users', usersRoutes);

// 404 for unknown routes
router.use((req, res, next) => next(createError(404, 'resourceNotFound', 'No resource found matching the request URI.')));

// Error handler
router.use((err, req, res, next) => {

  const code = getErrorStatusCode(err);
  if (code >= 400 && code <= 499) {
    apiLogger.debug(err.message);
  } else {
    apiLogger.warn(err.stack);
  }

  res
    .status(code)
    .set(err.headers || {})
    .send(serializeError(err));
});

/**
 * Determines the HTTP status code of the response depending on the error type.
 */
function getErrorStatusCode(err) {
  if (err.status) {
    return err.status;
  } else if (err.name === 'ValidationError') {
    return 422;
  } else {
    return 500;
  }
}

/**
 * Builds an HTTP response body based on an error object.
 */
function serializeError(err) {

  const properties = err.name === 'ValidationError' ? { errors: err.errors } : err.properties;

  return {
    code: err.code || 'unexpected',
    message: err.name === 'ValidationError' || err.expose ? err.message : 'An unexpected error occurred',
    ...properties
  };
}

module.exports = router;
