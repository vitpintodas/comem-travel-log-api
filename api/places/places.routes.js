const express = require('express');

const { canModify, createPlace, loadPlaceById, removePlace, retrieveAllPlaces, retrievePlace, updatePlace } = require('./places.api');
const { authenticate, authorize } = require('../../utils/auth');

const router = express.Router();

/**
 * @api {post} /api/places Create a new place
 * @apiName CreatePlace
 * @apiGroup Places
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** you may only create a place in a trip that you created.
 *
 * Create a place in a trip.
 *
 * @apiUse AuthorizedResource
 * @apiUse JsonRequestBody
 * @apiUse PlaceIncludes
 * @apiUse PlaceResponseBody
 *
 * @apiParam (JSON Request Body) {String{3..100}} name Name of the place. Must be unique within the trip.
 * @apiParam (JSON Request Body) {String{5..50000}} description A detailed description of the place.
 * @apiParam (JSON Request Body) {GeoJsonPoint} location A GeoJSON point indicating the geographical location of the place.
 * @apiParam (JSON Request Body) {String} [tripHref] A hyperlink reference to the trip during which the place was visited. **Either this or `tripId` is mandatory.**
 * @apiParam (JSON Request Body) {String} [tripId] The identifier of the trip during which the place was visited. **Either this or `tripHref` is mandatory.**
 * @apiParam (JSON Request Body) {String{10..500}} [pictureUrl] A URL to a picture of the place.
 *
 * @apiParamExample {request} Request Example
 *     POST https://comem-travel-log-api.herokuapp.com/api/places HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "name": "Somewhere",
 *       "description": "Over the rainbow"
 *     }
 *
 * @apiSuccessExample {json} 201 Created:
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: https://comem-travel-log-api.herokuapp.com/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb
 *
 *     {
 *       "createdAt": "2018-12-09T17:20:22.030Z",
 *       "description": "Over the rainbow",
 *       "href": "/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *       "id": "0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *       "location": {
 *         "type": "Point"
 *         "coordinates": [ 120.5412, -48.1850159 ],
 *       },
 *       "name": "Somewhere",
 *       "pictureUrl": "https://www.example.com/picture.jpg",
 *       "tripHref": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "tripId": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "updatedAt": "2018-12-09T17:20:22.030Z"
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
 *         "location.coordinates": {
 *           "kind": "coordinates",
 *           "message": "Coordinates must be an array of 2 to 3 numbers: longitude (between -180 and 180) and latitude (between -90 and 90) and an optional altitude",
 *           "name": "ValidatorError",
 *           "path": "location.coordinates",
 *           "properties": {
 *             "message": "Coordinates must be an array of 2 to 3 numbers: longitude (between -180 and 180) and latitude (between -90 and 90) and an optional altitude",
 *             "path": "location.coordinates",
 *             "type": "coordinates",
 *             "value": [ 30.34, 120.32 ]
 *           },
 *           "value": [ 30.34, 120.32 ]
 *         },
 *         "name": {
 *           "kind": "minlength",
 *           "message": "Path `name` (`s`) is shorter than the minimum allowed length (3).",
 *           "name": "ValidatorError",
 *           "path": "name",
 *           "properties": {
 *             "message": "Path `name` (`s`) is shorter than the minimum allowed length (3).",
 *             "minlength": 3,
 *             "path": "name",
 *             "type": "minlength",
 *             "value": "s"
 *           },
 *           "value": "s"
 *         }
 *       },
 *       "message": "Place validation failed: name: Path `name` (`s`) is shorter than the minimum allowed length (3)., location.coordinates: Coordinates must be an array of 2 to 3 numbers: longitude (between -180 and 180) and latitude (between -90 and 90) and an optional altitude"
 *     }
 */
router.post('/',
  authenticate,
  createPlace);

/**
 * @api {get} /api/places List or search places
 * @apiName RetrieveAllPlaces
 * @apiGroup Places
 *
 * @apiParamExample {request} Request Example
 *     GET https://comem-travel-log-api.herokuapp.com/api/places HTTP/1.1
 *
 * @apiUse IdentifiedResource
 * @apiUse Pagination
 * @apiUse PlaceIncludes
 * @apiUse PlaceResponseBody
 *
 * @apiParam (URL Query Parameters) {String} [trip] Select places in the trip(s) with the specified ID(s).
 * @apiParam (URL Query Parameters) {String} [name] Select places with the specified name(s).
 * @apiParam (URL Query Parameters) {String} [search] Select places with a name or description containing the specified search term(s).
 * @apiParam (URL Query Parameters) {String} [bbox] Select places within a rectangular geographical area. This must be a comma-delimited string of 4 numbers: the longitude and latitude of the bounding box's south-west corner, followed by the longitude and latitude of the bounding box's north-east corner.
 * @apiParam (URL Query Parameters) {String} [near] Select places close to a geographical point. This must be a comma-delimited string of 3 or 4 numbers. The first 2 or 3 numbers are the longitude, latitude and optional altitude of the point, and the last number is the max distance from the point in which to search, in meters.
 * @apiParam (URL Query Parameters) {String="name","createdAt","updatedAt","id","href","trip.title","trip.id","trip.href"} [sort=createdAt] Specify how the listed places will be sorted. Prefix a parameter with a minus sign (`-`) to sort in descending order. This parameter can be used multiple times to sort by multiple criteria.
 *
 * @apiParamExample {query} trip
 *     ?trip=6d1bd6d6-f4f3-4efe-807d-cd1d2ecee93a
 * @apiParamExample {query} name
 *     ?name=somewhere
 * @apiParamExample {query} search
 *     ?search=somewhere&search=rainbow
 * @apiParamExample {query} href
 *     ?href=/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb
 * @apiParamExample {query} bbox
 *     ?bbox=-34.51,120.59832,48.1340,150.208519
 * @apiParamExample {query} near
 *     ?near=40.12,170.290184,1000
 * @apiParamExample {query} sort
 *     ?sort=trip.name&sort=-createdAt
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: <https://comem-travel-log-api.herokuapp.com/api/places?pageSize=50&page=2>; rel="self last",
 *           <https://comem-travel-log-api.herokuapp.com/api/places?pageSize=50&page=1>; rel="first prev"
 *     Pagination-Page: 2
 *     Pagination-PageSize: 50
 *     Pagination-Total: 52
 *     Pagination-Filtered-Total 52
 *
 *     [
 *       {
 *         "createdAt": "2018-12-09T17:20:22.030Z",
 *         "description": "Over the rainbow",
 *         "href": "/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *         "id": "0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *         "location": {
 *           "type": "Point"
 *           "coordinates": [ 120.5412, -48.1850159 ],
 *         },
 *         "name": "Somewhere",
 *         "pictureUrl": "https://www.example.com/picture.jpg",
 *         "tripHref": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *         "tripId": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *         "updatedAt": "2018-12-09T17:20:22.030Z"
 *       },
 *       {
 *         "createdAt": "2018-12-09T18:10:01.000Z",
 *         "description": "There it was",
 *         "href": "/api/places/b2395fca-3571-40bb-9334-e218e44b5e08",
 *         "id": "b2395fca-3571-40bb-9334-e218e44b5e08",
 *         "location": {
 *           "type": "Point"
 *           "coordinates": [ 48.12351, 89.9123 ],
 *         },
 *         "name": "Somewhere else",
 *         "tripHref": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *         "tripId": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *         "updatedAt": "2018-12-10T10:22:22.103Z"
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
  retrieveAllPlaces);

/**
 * @api {get} /api/places/:id Retrieve one place
 * @apiName RetrievePlace
 * @apiGroup Places
 *
 * @apiUse UrlIdentifier
 * @apiUse PlaceIncludes
 * @apiUse PlaceResponseBody
 *
 * @apiParamExample {request} Request Example
 *     GET https://comem-travel-log-api.herokuapp.com/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb HTTP/1.1
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "createdAt": "2018-12-09T17:20:22.030Z",
 *       "description": "Over the rainbow",
 *       "href": "/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *       "id": "0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *       "location": {
 *         "type": "Point"
 *         "coordinates": [ 120.5412, -48.1850159 ],
 *       },
 *       "name": "Somewhere",
 *       "pictureUrl": "https://www.example.com/picture.jpg",
 *       "tripHref": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "tripId": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "updatedAt": "2018-12-09T17:20:22.030Z"
 *     }
 *
 * @apiError (Error Response Codes) {Object} recordNotFound **404 Not Found** - No place was found with the ID specified in the request URI.
 *
 * @apiErrorExample {json} recordNotFound
 *     HTTP/1.1 404 Not Found
 *     Content-Type: application/json
 *
 *     {
 *       "code": "recordNotFound",
 *       "message": "No place found with ID foo"
 *     }
 */
router.get('/:id',
  loadPlaceById,
  retrievePlace);

/**
 * @api {patch} /api/places/:id Update a place
 * @apiName UpdatePlace
 * @apiGroup Places
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** a place may only be modified by the user who created it.
 *
 * You can send either a partial or a full update. Only properties present in the request will be updated.
 *
 * @apiUse JsonRequestBody
 * @apiUse PlaceIncludes
 * @apiUse PlaceResponseBody
 * @apiUse AuthorizedResource
 * @apiUse ProtectedResource
 *
 * @apiParam (JSON Request Body) {String{3..100}} [name] Name of the place. Must be unique within the trip.
 * @apiParam (JSON Request Body) {String{5..50000}} [description] A detailed description of the place.
 * @apiParam (JSON Request Body) {GeoJsonPoint} [location] A GeoJSON point indicating the geographical location of the place.
 * @apiParam (JSON Request Body) {String} [tripHref] A hyperlink reference to the trip during which the place was visited.
 * @apiParam (JSON Request Body) {String} [tripId] The identifier of the trip during which the place was visited.
 * @apiParam (JSON Request Body) {String{10..500}} [pictureUrl] A URL to a picture of the place.
 *
 * @apiParamExample {request} Request Example
 *     PATCH https://comem-travel-log-api.herokuapp.com/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "description": "Under the rainbow",
 *       "pictureUrl": "https://www.example.com/another-picture.png"
 *     }
 *
 * @apiSuccessExample {json} 200 OK:
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "createdAt": "2018-12-09T17:20:22.030Z",
 *       "description": "Under the rainbow",
 *       "href": "/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *       "id": "0860ab21-98e8-4cdd-a407-06d2a50989eb",
 *       "location": {
 *         "type": "Point"
 *         "coordinates": [ 120.5412, -48.1850159 ],
 *       },
 *       "name": "Somewhere",
 *       "pictureUrl": "https://www.example.com/another-picture.png",
 *       "tripHref": "/api/trips/7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "tripId": "7f063c6e-7717-401a-aa47-34a52f6a45cf",
 *       "updatedAt": "2018-12-10T20:01:54.111Z"
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
 *           "kind": "minlength",
 *           "message": "Path `name` (`s`) is shorter than the minimum allowed length (3).",
 *           "name": "ValidatorError",
 *           "path": "name",
 *           "properties": {
 *             "message": "Path `name` (`s`) is shorter than the minimum allowed length (3).",
 *             "minlength": 3,
 *             "path": "name",
 *             "type": "minlength",
 *             "value": "s"
 *           },
 *           "value": "s"
 *         }
 *       },
 *       "message": "Place validation failed: name: Path `name` (`s`) is shorter than the minimum allowed length (3)."
 *     }
 */
router.patch('/:id',
  authenticate,
  loadPlaceById,
  authorize(canModify),
  updatePlace);

/**
 * @api {delete} /api/places/:id Delete a place
 * @apiName RemovePlace
 * @apiGroup Places
 * @apiDescription **Authentication:** this request requires authentication through the `Authorization` header.
 *
 * **Authorization:** a place may only be deleted by the user who created it.
 *
 * The place will be permanently deleted.
 *
 * @apiUse UrlIdentifier
 * @apiUse AuthorizedResource
 * @apiUse ProtectedResource
 *
 * @apiParamExample {request} Request Example
 *     DELETE https://comem-travel-log-api.herokuapp.com/api/places/0860ab21-98e8-4cdd-a407-06d2a50989eb HTTP/1.1
 *
 * @apiSuccessExample {json} 204 No Content:
 *     HTTP/1.1 204 No Content
 *
 * @apiError (Error Response Codes) {Object} recordNotFound **404 Not Found** - No place was found with the ID specified in the request URI.
 *
 * @apiErrorExample {json} recordNotFound
 *     HTTP/1.1 404 Not Found
 *     Content-Type: application/json
 *
 *     {
 *       "code": "recordNotFound",
 *       "message": "No place found with ID foo"
 *     }
 */
router.delete('/:id',
  authenticate,
  loadPlaceById,
  authorize(canModify),
  removePlace);

/**
 * @apiDefine PlaceIncludes
 * @apiParam (URL Query Parameters) {String="trip","trip.user"} [include] Include associated resources in the response (e.g. adding `?include=trip` will add a `trip` object to the JSON response body).
 * @apiParamExample {query} include
 *     ?include=trip.user
 */

/**
 * @apiDefine PlaceResponseBody
 *
 * @apiSuccess (JSON Response Body) {String{36}} id Unique identifier of the place.
 * @apiSuccess (JSON Response Body) {String{48}} href Hyperlink reference to the place.
 * @apiSuccess (JSON Response Body) {String{3..100}} name Name of the place. Unique within the trip.
 * @apiSuccess (JSON Response Body) {String{5..50000}} description A detailed description of the place.
 * @apiSuccess (JSON Response Body) {GeoJsonPoint} location A GeoJSON point indicating the geographical location of the place.
 * @apiSuccess (JSON Response Body) {String{36}} tripId The identifier of the trip during which the place was visited.
 * @apiSuccess (JSON Response Body) {String{47}} tripHref A hyperlink reference to the trip during which the place was visited.
 * @apiSuccess (JSON Response Body) {String{10..500}} [pictureUrl] A URL to a picture of the place.
 * @apiSuccess (JSON Response Body) {Date} createdAt The date at which the place was created.
 * @apiSuccess (JSON Response Body) {Date} updatedAt The date at which the place was last modified.
 */

module.exports = router;
