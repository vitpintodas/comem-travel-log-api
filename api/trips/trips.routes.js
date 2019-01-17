const express = require('express');

const { canModify, createTrip, loadTripById, removeTrip, retrieveAllTrips, retrieveTrip, updateTrip } = require('./trips.api');
const { authenticate, authorize } = require('../../utils/auth');

const router = express.Router();

/**
 * @api {post} /api/trips Create a new trip
 * @apiName CreateTrip
 * @apiGroup Trips
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * Create a trip under your own user account.
 *
 * @apiUse AuthorizedResource
 * @apiUse JsonRequestBody
 * @apiUse TripResponseBody
 *
 * @apiParam (JSON Request Body) {String{3..100}} title Title of the trip. Must be unique.
 * @apiParam (JSON Request Body) {String{5..50000}} description A detailed description of the trip.
 *
 * @apiParamExample {request} Request Example
 *     POST https://comem-travel-log-api.herokuapp.com/api/trips HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "title": "My Bad Trip",
 *       "description": "It was awesome!"
 *     }
 *
 * @apiSuccessExample {json} 201 Created:
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: https://comem-travel-log-api.herokuapp.com/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf
 *
 *     {
 *       "createdAt": "2018-12-09T11:58:18.265Z",
 *       "description": "It was awesome!",
 *       "href": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "id": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "placesCount": 0,
 *       "title": "My Bad Trip",
 *       "updatedAt": "2018-12-09T11:58:18.265Z",
 *       "userHref": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "userId": "d68cf4e9-1349-4d45-b356-c1294e49ef23"
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
 *         "description": {
 *           "kind": "required",
 *           "message": "Path `description` is required.",
 *           "name": "ValidatorError",
 *           "path": "description",
 *           "properties": {
 *             "message": "Path `description` is required.",
 *             "path": "description",
 *             "type": "required"
 *           }
 *         },
 *         "title": {
 *           "kind": "minlength",
 *           "message": "Path `title` (`s`) is shorter than the minimum allowed length (3).",
 *           "name": "ValidatorError",
 *           "path": "title",
 *           "properties": {
 *             "message": "Path `title` (`s`) is shorter than the minimum allowed length (3).",
 *             "minlength": 3,
 *             "path": "title",
 *             "type": "minlength",
 *             "value": "s"
 *           },
 *           "value": "s"
 *         }
 *       },
 *       "message": "Trip validation failed: description: Path `description` is required., title: Path `title` (`s`) is shorter than the minimum allowed length (3)."
 *     }
 */
router.post('/',
  authenticate,
  createTrip);

/**
 * @api {get} /api/trips List or search trips
 * @apiName RetrieveAllTrips
 * @apiGroup Trips
 *
 * @apiParamExample {request} Request Example
 *     GET https://comem-travel-log-api.herokuapp.com/api/trips HTTP/1.1
 *
 * @apiUse IdentifiedResource
 * @apiUse Pagination
 * @apiUse TripResponseBody
 *
 * @apiParam (URL Query Parameters) {String} [user] Select trips owned by the user(s) with the specified ID(s).
 * @apiParam (URL Query Parameters) {String} [title] Select trips with the specified title(s).
 * @apiParam (URL Query Parameters) {String} [search] Select trips with a title or description containing the specified search term(s).
 * @apiParam (URL Query Parameters) {String="title","placesCount","createdAt","updatedAt","id","href","user.name","user.id","user.href"} [sort=-createdAt] Specify how the listed trips will be sorted. Prefix a parameter with a minus sign (`-`) to sort in descending order. This parameter can be used multiple times to sort by multiple criteria.
 *
 * @apiParamExample {query} user
 *     ?user=ceedea00-507a-4b27-a025-8918ca6758b9
 * @apiParamExample {query} title
 *     ?title=My+Bad+Trip
 * @apiParamExample {query} search
 *     ?search=bad&search=awesome
 * @apiParamExample {query} sort
 *     ?sort=user.name&sort=-placesCount&sort=-updatedAt
 * @apiParamExample {query} href
 *     ?href=/api/trips/d68cf4e9-1349-4d45-b356-c1294e49ef23
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: <https://comem-travel-log-api.herokuapp.com/api/trips?pageSize=50&page=2>; rel="self last",
 *           <https://comem-travel-log-api.herokuapp.com/api/trips?pageSize=50&page=1>; rel="first prev"
 *     Pagination-Page: 2
 *     Pagination-PageSize: 50
 *     Pagination-Total: 52
 *     Pagination-Filtered-Total 52
 *
 *     [
 *       {
 *         "createdAt": "2018-12-09T11:58:18.265Z",
 *         "description": "It was awesome!",
 *         "href": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *         "id": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *         "placesCount": 6,
 *         "title": "My Bad Trip",
 *         "updatedAt": "2018-12-09T11:58:18.265Z",
 *         "userHref": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *         "userId": "d68cf4e9-1349-4d45-b356-c1294e49ef23"
 *       },
 *       {
 *         "createdAt": "2018-12-09T11:58:18.265Z",
 *         "description": "It was something else.",
 *         "href": "/api/trips/3f1a9a0b-fad3-4056-af2e-3221f4fecb1a",
 *         "id": "3f1a9a0b-fad3-4056-af2e-3221f4fecb1a",
 *         "placesCount": 2,
 *         "title": "My Other Trip",
 *         "updatedAt": "2018-12-10T11:58:18.265Z",
 *         "userHref": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *         "userId": "d68cf4e9-1349-4d45-b356-c1294e49ef23"
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
  retrieveAllTrips);

/**
 * @api {get} /api/trips/:id Retrieve one trip
 * @apiName RetrieveTrip
 * @apiGroup Trips
 *
 * @apiUse UrlIdentifier
 * @apiUse TripResponseBody
 *
 * @apiParamExample {request} Request Example
 *     GET https://comem-travel-log-api.herokuapp.com/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf HTTP/1.1
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "createdAt": "2018-12-09T11:58:18.265Z",
 *       "description": "It was awesome!",
 *       "href": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "id": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "placesCount": 7,
 *       "title": "My Bad Trip",
 *       "updatedAt": "2018-12-09T11:58:18.265Z",
 *       "userHref": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "userId": "d68cf4e9-1349-4d45-b356-c1294e49ef23"
 *     }
 *
 * @apiError (Error Response Codes) {Object} recordNotFound **404 Not Found** - No trip was found with the ID specified in the request URI.
 *
 * @apiErrorExample {json} recordNotFound
 *     HTTP/1.1 404 Not Found
 *     Content-Type: application/json
 *
 *     {
 *       "code": "recordNotFound",
 *       "message": "No trip found with ID foo"
 *     }
 */
router.get('/:id',
  loadTripById,
  retrieveTrip);

/**
 * @api {patch} /api/trips/:id Update a trip
 * @apiName UpdateTrip
 * @apiGroup Trips
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** a trip may only be modified by the user who created it.
 *
 * You can send either a partial or a full update. Only properties present in the request will be updated.
 *
 * @apiUse JsonRequestBody
 * @apiUse TripResponseBody
 * @apiUse AuthorizedResource
 * @apiUse ProtectedResource
 *
 * @apiParam (JSON Request Body) {String{3..100}} [title] Title of the trip. Must be unique.
 * @apiParam (JSON Request Body) {String{5..50000}} [description] A detailed description of the trip.
 *
 * @apiParamExample {request} Request Example
 *     PATCH https://comem-travel-log-api.herokuapp.com/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "title": "My Good Trip"
 *     }
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "createdAt": "2018-12-09T11:58:18.265Z",
 *       "description": "It was awesome!",
 *       "href": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "id": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "placesCount": 3,
 *       "title": "My Bad Trip",
 *       "updatedAt": "2018-12-10T12:13:14.111Z",
 *       "userHref": "/api/users/d68cf4e9-1349-4d45-b356-c1294e49ef23",
 *       "userId": "d68cf4e9-1349-4d45-b356-c1294e49ef23"
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
 *         "title": {
 *           "kind": "minlength",
 *           "message": "Path `title` (`s`) is shorter than the minimum allowed length (3).",
 *           "name": "ValidatorError",
 *           "path": "title",
 *           "properties": {
 *             "message": "Path `title` (`s`) is shorter than the minimum allowed length (3).",
 *             "minlength": 3,
 *             "path": "title",
 *             "type": "minlength",
 *             "value": "s"
 *           },
 *           "value": "s"
 *         }
 *       },
 *       "message": "Trip validation failed: title: Path `title` (`s`) is shorter than the minimum allowed length (3)."
 *     }
 */
router.patch('/:id',
  authenticate,
  loadTripById,
  authorize(canModify),
  updateTrip);

/**
 * @api {delete} /api/trips/:id Delete a trip
 * @apiName RemoveTrip
 * @apiGroup Trips
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** a trip may only be deleted by the user who created it.
 *
 * The trip will be permanently deleted along with all the places in it.
 *
 * @apiUse UrlIdentifier
 * @apiUse AuthorizedResource
 * @apiUse ProtectedResource
 *
 * @apiParamExample {request} Request Example
 *     DELETE https://comem-travel-log-api.herokuapp.com/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf HTTP/1.1
 *
 * @apiSuccessExample {json} 204 No Content:
 *     HTTP/1.1 204 No Content
 *
 * @apiError (Error Response Codes) {Object} recordNotFound **404 Not Found** - No trip was found with the ID specified in the request URI.
 *
 * @apiErrorExample {json} recordNotFound
 *     HTTP/1.1 404 Not Found
 *     Content-Type: application/json
 *
 *     {
 *       "code": "recordNotFound",
 *       "message": "No trip found with ID foo"
 *     }
 */
router.delete('/:id',
  authenticate,
  loadTripById,
  authorize(canModify),
  removeTrip);

/**
 * @apiDefine TripResponseBody
 *
 * @apiSuccess (JSON Response Body) {String{36}} id Unique identifier of the trip.
 * @apiSuccess (JSON Response Body) {String{47}} href Hyperlink reference to the trip.
 * @apiSuccess (JSON Response Body) {String{3..100}} title Unique title of the trip.
 * @apiSuccess (JSON Response Body) {String{5..50000}} description A detailed description of the trip.
 * @apiSuccess (JSON Response Body) {Number} placesCount The number of places in the trip.
 * @apiSuccess (JSON Response Body) {String{36}} userId The unique identifier of the user who created the trip.
 * @apiSuccess (JSON Response Body) {String{47}} userHref A hyperlink reference to the user who created the trip.
 * @apiSuccess (JSON Response Body) {Date} createdAt The date at which the trip was created.
 * @apiSuccess (JSON Response Body) {Date} updatedAt The date at which the trip was last modified.
 */

module.exports = router;
