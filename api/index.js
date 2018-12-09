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
 * Determines the textual code identifying an error.
 */
function getErrorCode(err) {
  if (err.code) {
    return err.code;
  } else if (err.name === 'ValidationError') {
    return 'invalid';
  } else {
    return 'unexpected';
  }
}

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
    code: getErrorCode(err),
    message: err.name === 'ValidationError' || err.expose ? err.message : 'An unexpected error occurred',
    ...properties
  };
}

/**
 * @apiDefine AuthorizedResource
 *
 * @apiHeader (Request Headers) {String} Authorization You must send a bearer token to authenticate.
 *
 * @apiHeaderExample {String} Authorization
 *     Authorization: Bearer eyJhbGciOiJIUzI1N.eyJzdWIiOiIxMjM0NTY3ODkw.SflKxwRJSMeKKF
 *
 * @apiError (Error Response Codes) {Object} authHeaderMissing **401 Unauthorized** - This resource requires authentication and you have not sent an Authorization header in your request.
 * @apiError (Error Response Codes) {Object} authHeaderMalformed **401 Unauthorized** - Your Authorization header is not in the correct format (i.e. "Bearer TOKEN").
 * @apiError (Error Response Codes) {Object} authTokenExpired **401 Unauthorized** - The token you sent in the Authorization header was valid but has expired.
 * @apiError (Error Response Codes) {Object} authTokenInvalid **401 Unauthorized** - The token you sent in the Authorization header is invalid (e.g. it was tampered with or the user account no longer exists).
 *
 * @apiErrorExample {json} authHeaderMissing
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authHeaderMissing",
 *       "message": "Authorization header is missing"
 *     }
 *
 * @apiErrorExample {json} authHeaderMalformed
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authHeaderMalformed",
 *       "message": "Authorization header is not a valid bearer token (format must be \"Bearer TOKEN\")"
 *     }
 *
 * @apiErrorExample {json} authTokenExpired
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authTokenExpired",
 *       "message": "Authentication token has expired"
 *     }
 *
 * @apiErrorExample {json} authTokenInvalid
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authTokenInvalid",
 *       "message": "Authentication token is invalid"
 *     }
 */

/**
 * @apiDefine ProtectedResource
 *
 * @apiError (Error Response Codes) {Object} forbidden **403 Forbidden** - You are not authorized to perform this action. You need to authenticate with a user account that has more privileges.
 *
 * @apiErrorExample {json} forbidden
 *     HTTP/1.1 403 Forbidden
 *     Content-Type: application/json
 *
 *     {
 *       "code": "forbidden",
 *       "message": "You are not authorized to perform this action; authenticate with a user account that has more privileges"
 *     }
 */

/**
 * @apiDefine JsonRequestBody
 *
 * @apiError (Error Response Codes) {Object} wrongRequestFormat **415 Unsupported Media Type** - You are sending a request body that is not in JSON or you forgot to add the Content-Type header.
 * @apiError (Error Response Codes) {Object} invalidRequestBody **400 Bad Request** - You are sending a JSON value that is not an object (e.g. an array) in the request body.
 *
 * @apiErrorExample {json} wrongRequestFormat
 *     HTTP/1.1 415 Unsupported Media Type
 *     Content-Type: application/json
 *
 *     {
 *       "code": "wrongRequestFormat",
 *       "message": "This resource only has an application/json representation, but the content type of the request is application/x-www-form-urlencoded"
 *     }
 *
 * @apiErrorExample {json} invalidRequestBody
 *     HTTP/1.1 400 Bad Request
 *     Content-Type: application/json
 *
 *     {
 *       "code": "invalidRequestBody",
 *       "message": "The request body must be a JSON object"
 *     }
 */

/**
 * @apiDefine Pagination
 *
 * @apiParam (URL Query Parameters) {Number{1..}} page=1 Number of the page to display.
 * @apiParam (URL Query Parameters) {Number{1..50}} pageSize=10 The number of elements to display per page.
 *
 * @apiParamExample {query} page
 *     &page=2
 * @apiParamExample {query} pageSize
 *     &pageSize=25
 */

/**
 * @apiDefine IdentifiedResource
 *
 * @apiParam (URL Query Parameters) {String} href Select the elements with the specified hyperlink reference(s).
 * @apiParam (URL Query Parameters) {String} id Select the elements with the specified ID(s).
 *
 * @apiParamExample {query} id
 *     &id=d68cf4e9-1349-4d45-b356-c1294e49ef23
 */

/**
 * @apiDefine UrlIdentifier
 *
 * @apiParam (URL Path Parameters) {String} id The unique identifier of the resource.
 */

module.exports = router;
