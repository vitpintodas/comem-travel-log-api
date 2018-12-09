const express = require('express');

const { canModify, createUser, loadUserById, removeUser, retrieveAllUsers, retrieveUser, updateUser } = require('./users.api');
const { requireJson } = require('../../utils/api');
const { authenticate, authorize } = require('../../utils/auth');

const router = express.Router();

/**
 * @api {post} /api/users Register a new user account
 * @apiName CreateUser
 * @apiGroup Users
 * @apiDescription Registration is open to anyone.
 *
 * @apiUse JsonRequestBody
 * @apiUse UserResponseBody
 *
 * @apiParam (JSON Request Body) {String{3..25}} name Unique username. Must be **alphanumeric characters separated by hyphens**.
 * @apiParam (JSON Request Body) {String{4..}} password The password the user will use to log in.
 *
 * @apiParamExample {request} Request Example
 *     POST https://comem-travel-log-api.herokuapp.com/api/users HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "name": "jdoe",
 *       "password": "changeme"
 *     }
 *
 * @apiSuccessExample {json} 201 Created:
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: https://comem-travel-log-api.herokuapp.com/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23
 *
 *     {
 *       "createdAt": "2018-12-09T11:58:18.265Z",
 *       "href": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "id": "d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "name": "jdoe",
 *       "tripsCount": 0,
 *       "updatedAt": "2018-12-09T11:58:18.265Z"
 *     }
 *
 * @apiError (Error Response Codes) {Object} invalid **422 Unprocessable Entity** - The request contains semantically invalid properties.
 *
 * @apiErrorExample {json} invalid
 *     HTTP/1.1 422 Unprocessable Entity
 *     Content-Type: application/json
 *
 *     {
 *       "code": "invalid",
 *       "errors": {
 *         "name": {
 *           "kind": "regexp",
 *           "message": "Path `name` is invalid (---).",
 *           "name": "ValidatorError",
 *           "path": "name",
 *           "properties": {
 *             "message": "Path `name` is invalid (---).",
 *             "path": "name",
 *             "regexp": {},
 *             "type": "regexp",
 *             "value": "---"
 *           },
 *           "value": "---"
 *         },
 *         "password": {
 *           "kind": "required",
 *           "message": "Path `password` is required",
 *           "name": "ValidatorError",
 *           "path": "password",
 *           "properties": {
 *             "message": "Path `password` is required",
 *             "path": "password",
 *             "type": "required",
 *             "value": null
 *           },
 *           "value": null
 *         }
 *       },
 *       "message": "User validation failed: password: Path `password` is required, name: Path `name` is invalid (---)."
 *     }
 */
router.post('/',
  requireJson,
  createUser);

/**
 * @api {get} /api/users List or search user accounts
 * @apiName RetrieveAllUsers
 * @apiGroup Users
 *
 * @apiParamExample {request} Request Example
 *     GET https://comem-travel-log-api.herokuapp.com/api/users HTTP/1.1
 *
 * @apiUse IdentifiedResource
 * @apiUse Pagination
 * @apiUse UserResponseBody
 *
 * @apiParam (URL Query Parameters) {String} [name] Select users with the specified name(s).
 * @apiParam (URL Query Parameters) {String} [search] Select users with a name or description containing the specified search term(s).
 * @apiParam (URL Query Parameters) {String="name","tripsCount","createdAt","updatedAt","id","href"} [sort="-createdAt"] Specify how the listed users will be sorted. Prefix a parameter with a minus sign (`-`) to sort in descending order. This parameter can be used multiple times to sort by multiple criteria.
 *
 * @apiParamExample {query} name
 *     ?name=jdoe
 * @apiParamExample {query} search
 *     ?search=jd&search=js
 * @apiParamExample {query} sort
 *     ?sort=-tripsCount&sort=name&sort=-updatedAt
 * @apiParamExample {query} href
 *     ?href=/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: <https://comem-travel-log-api.herokuapp.com/api/users?pageSize=50&page=2>; rel="self last",
 *           <https://comem-travel-log-api.herokuapp.com/api/users?pageSize=50&page=1>; rel="first prev"
 *     Pagination-Page: 2
 *     Pagination-PageSize: 50
 *     Pagination-Total: 52
 *     Pagination-Filtered-Total 52
 *
 *     [
 *       {
 *         "createdAt": "2018-12-09T11:58:18.265Z",
 *         "href": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *         "id": "d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *         "name": "jdoe",
 *         "tripsCount": 2,
 *         "updatedAt": "2018-12-09T11:58:18.265Z"
 *       },
 *       {
 *         "createdAt": "2018-12-10T12:00:24.325Z",
 *         "href": "/api/users/aedf9be1-b46b-4d93-a969-29e52995ae40",
 *         "id": "aedf9be1-b46b-4d93-a969-29e52995ae40",
 *         "name": "jsmith",
 *         "tripsCount": 5,
 *         "updatedAt": "2018-12-11T08:23:10.099Z"
 *       }
 *     ]
 *
 * @apiError (Error Response Codes) {Object} invalidQueryParam **400 Bad Request** - Query parameters are invalid.
 *
 * @apiErrorExample {json} invalidQueryParam
 *     HTTP/1.1 400 Bad Request
 *     Content-Type: application/json
 *
 *     {
 *       "code": "invalidQueryParam",
 *       "message": "Query parameter \"pageSize\" must be an integer greater than or equal to 0 and less than or equal to 50, but its value is \"foo\"",
 *       "queryParam": "pageSize"
 *     }
 */
router.get('/',
  retrieveAllUsers);

/**
 * @api {get} /api/users/:id Retrieve one user account
 * @apiName RetrieveUser
 * @apiGroup Users
 *
 * @apiUse UrlIdentifier
 * @apiUse UserResponseBody
 *
 * @apiParamExample {request} Request Example
 *     GET https://comem-travel-log-api.herokuapp.com/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23 HTTP/1.1
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "createdAt": "2018-12-09T11:58:18.265Z",
 *       "href": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "id": "d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "name": "jdoe",
 *       "tripsCount": 2,
 *       "updatedAt": "2018-12-09T11:58:18.265Z"
 *     }
 *
 * @apiError (Error Response Codes) {Object} recordNotFound **404 Not Found** - No user was found with the ID specified in the request URI.
 *
 * @apiErrorExample {json} recordNotFound
 *     HTTP/1.1 404 Not Found
 *     Content-Type: application/json
 *
 *     {
 *       "code": "recordNotFound",
 *       "message": "No user found with ID foo"
 *     }
 */
router.get('/:id',
  loadUserById,
  retrieveUser);

/**
 * @api {patch} /api/users/:id Update a user account
 * @apiName UpdateUser
 * @apiGroup Users
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** a user account may only be modified by the user itself.
 *
 * You can send either a partial or a full update. Only properties present in the request will be updated.
 *
 * @apiUse JsonRequestBody
 * @apiUse UserResponseBody
 * @apiUse AuthorizedResource
 * @apiUse ProtectedResource
 *
 * @apiParam (JSON Request Body) {String{3..25}} [name] Unique username. Must be **alphanumeric characters separated by hyphens**.
 * @apiParam (JSON Request Body) {String{4..}} [password] The password the user will use to log in.
 *
 * @apiParamExample {request} Request Example
 *     PATCH https://comem-travel-log-api.herokuapp.com/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23 HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "name": "jsmith"
 *     }
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "createdAt": "2018-12-09T11:58:18.265Z",
 *       "href": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "id": "d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "name": "jsmith",
 *       "tripsCount": 2,
 *       "updatedAt": "2018-12-09T11:58:18.265Z"
 *     }
 *
 * @apiError (Error Response Codes) {Object} invalid **422 Unprocessable Entity** - The request contains semantically invalid properties.
 *
 * @apiErrorExample {json} invalid
 *     HTTP/1.1 422 Unprocessable Entity
 *     Content-Type: application/json
 *
 *     {
 *       "code": "invalid",
 *       "errors": {
 *         "name": {
 *           "kind": "regexp",
 *           "message": "Path `name` is invalid (---).",
 *           "name": "ValidatorError",
 *           "path": "name",
 *           "properties": {
 *             "message": "Path `name` is invalid (---).",
 *             "path": "name",
 *             "regexp": {},
 *             "type": "regexp",
 *             "value": "---"
 *           },
 *           "value": "---"
 *         }
 *       },
 *       "message": "User validation failed: name: Path `name` is invalid (---)."
 *     }
 */
router.patch('/:id',
  authenticate,
  loadUserById,
  authorize(canModify),
  requireJson,
  updateUser);

/**
 * @api {delete} /api/users/:id Delete a user account
 * @apiName RemoveUser
 * @apiGroup Users
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** a user account may only be deleted by the user itself.
 *
 * The user account will be permanently deleted along with all the trips and places created by that user.
 *
 * @apiUse UrlIdentifier
 * @apiUse AuthorizedResource
 * @apiUse ProtectedResource
 *
 * @apiParamExample {request} Request Example
 *     DELETE https://comem-travel-log-api.herokuapp.com/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23 HTTP/1.1
 *
 * @apiSuccessExample {json} 204 No Content:
 *     HTTP/1.1 204 No Content
 *
 * @apiError (Error Response Codes) {Object} recordNotFound **404 Not Found** - No user was found with the ID specified in the request URI.
 *
 * @apiErrorExample {json} recordNotFound
 *     HTTP/1.1 404 Not Found
 *     Content-Type: application/json
 *
 *     {
 *       "code": "recordNotFound",
 *       "message": "No user found with ID foo"
 *     }
 */
router.delete('/:id',
  authenticate,
  loadUserById,
  authorize(canModify),
  removeUser);

/**
 * @apiDefine UserResponseBody
 *
 * @apiSuccess (JSON Response Body) {String} id Unique identifier of the user.
 * @apiSuccess (JSON Response Body) {String} href Hyperlink reference to the user.
 * @apiSuccess (JSON Response Body) {String} name Unique username.
 * @apiSuccess (JSON Response Body) {Number} tripsCount The number of trips created by the user.
 * @apiSuccess (JSON Response Body) {Date} createdAt The date at which the user account was registered.
 * @apiSuccess (JSON Response Body) {Date} updatedAt The date at which the user account was last modified.
 */

module.exports = router;
