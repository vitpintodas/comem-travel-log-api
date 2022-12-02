const express = require('express');

const { createAuthenticationToken } = require('./auth.api');

const router = express.Router();

/**
 * @api {post} /api/auth Request an authentication token
 * @apiName CreateAuthenticationToken
 * @apiGroup Authentication
 * @apiDescription Provide your username and password and receive an authentication token to access protected API resources (e.g. change your password or update a trip).
 * You need to be a [registered user](#api-Users-CreateUser) to do this.
 *
 * @apiUse JsonRequestBody
 *
 * @apiParam (JSON Request Body) {String} username The username of the user logging in.
 * @apiParam (JSON Request Body) {String} password The password of the user.
 *
 * @apiParamExample {request} Request Example
 *     POST https://comem-travel-log-api.onrender.com/api/auth HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "username": "jdoe",
 *       "password": "changeme"
 *     }
 *
 * @apiSuccess (JSON Response Body) {String} token A bearer token that can be sent in the `Authorization` header to authenticate when accessing protected API resources.
 * @apiSuccess (JSON Response Body) {Object} user The user that logged in.
 * @apiSuccess (JSON Response Body) {String} user.id Unique identifier of the user.
 * @apiSuccess (JSON Response Body) {String} user.href Hyperlink reference to the user.
 * @apiSuccess (JSON Response Body) {String} user.name Unique username.
 * @apiSuccess (JSON Response Body) {Number} user.tripsCount The number of trips created by the user.
 * @apiSuccess (JSON Response Body) {Date} user.createdAt The date at which the user account was registered.
 * @apiSuccess (JSON Response Body) {Date} user.updatedAt The date at which the user account was last modified.
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "token": "eyJhbGciOiJIUzI1N.eyJzdWIiOiIxMjM0NTY3ODkw.SflKxwRJSMeKKF",
 *       "user": {
 *         "createdAt": "2018-12-09T11:58:18.265Z",
 *         "href": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *         "id": "d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *         "name": "jdoe",
 *         "tripsCount": 2,
 *         "updatedAt": "2018-12-09T11:58:18.265Z"
 *       }
 *     }
 *
 * @apiError (Error Response Codes) {Object} authCredentialsMissing **401 Unauthorized** - You have not sent the username or the password.
 * @apiError (Error Response Codes) {Object} authCredentialsUnknown **401 Unauthorized** - No user exists with the specified username.
 * @apiError (Error Response Codes) {Object} authCredentialsInvalid **401 Unauthorized** - The password is incorrect.
 *
 * @apiErrorExample {json} authCredentialsMissing
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authCredentialsMissing",
 *       "message": "Username or password is missing"
 *     }
 *
 * @apiErrorExample {json} authCredentialsUnknown
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authCredentialsUnknown",
 *       "message": "There is no user named \"foo\""
 *     }
 *
 * @apiErrorExample {json} authCredentialsInvalid
 *     HTTP/1.1 401 Unauthorized
 *     Content-Type: application/json
 *
 *     {
 *       "code": "authCredentialsInvalid",
 *       "message": "Password is incorrect"
 *     }
 */
router.post('/', createAuthenticationToken);

module.exports = router;
