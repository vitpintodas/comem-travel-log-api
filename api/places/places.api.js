const { escapeRegExp, isFinite } = require('lodash');

const config = require('../../config');
const Place = require('../../models/place');
const { addRelatedPropertyPipelineFactory, invalidQueryParamError, paginate, sortPipelineFactory, toArray } = require('../../utils/api');
const { forbiddenError } = require('../../utils/auth');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');
const { aggregateToDocuments } = require('../../utils/models');

const PIPELINE = addRelatedPropertyPipelineFactory(Place, 'Trip', [ 'apiId', 'title' ]);

const POPULATE = {
  path: 'trip',
  populate: {
    path: 'user'
  }
};

const placesLogger = config.logger('api:places');

exports.createPlace = route(async (req, res) => {

  const place = new Place().parseFrom(req.body);
  await authorizeCreatePlace(req, place);

  await place.save();
  await place.populate(POPULATE).execPopulate();

  res
    .status(201)
    .set('Location', config.joinUrl(place.href))
    .send(place);

  placesLogger.info(`Created place ${place.apiId} named "${place.name}" in trip ${place.trip.apiId}`);
});

exports.retrieveAllPlaces = route(async (req, res) => {

  const paginatedPipeline = await paginate(req, res, Place, PIPELINE, createPlaceFilters);
  const sortedPipeline = await sortPlacesPipeline(req, paginatedPipeline);
  const places = await aggregateToDocuments(Place, sortedPipeline);

  await Place.populate(places, POPULATE);

  res.send(places);
});

exports.retrievePlace = route(async (req, res) => {
  res.send(req.place);
});

exports.updatePlace = route(async (req, res) => {

  const place = req.place;
  place.parseFrom(req.body);

  // TODO: handle trip change

  await place.save();

  res.send(place);

  placesLogger.info(`Updated place ${place.apiId} named "${place.name}"`);
});

exports.removePlace = route(async (req, res) => {

  const place = req.place;
  await place.remove();

  res.sendStatus(204);

  placesLogger.info(`Removed place ${place.apiId} named "${place.name}"`);
});

exports.canModify = function(req) {
  return req.currentUser && req.place && req.place.trip && req.place.trip.user && req.currentUser.apiId === req.place.trip.user.apiId;
};

exports.loadPlaceById = route(async (req, res, next) => {

  const apiId = req.params.id;
  if (!apiId) {
    return next(placeNotFound(apiId));
  }

  const place = await Place.findOne({ apiId }).populate(POPULATE);
  if (!place) {
    return next(placeNotFound(apiId));
  }

  req.place = place;
  next();
});

async function authorizeCreatePlace(req, place) {

  await place.loadRelatedTrip();
  if (!place._trip) {
    return;
  }

  await place._trip.populate('user').execPopulate();
  if (!req.currentUser || !place._trip.user || req.currentUser.apiId !== place._trip.user.apiId) {
    throw forbiddenError();
  }
}

async function createPlaceFilters(req) {

  const filters = [];

  // "bbox" query param filter to select places within a rectangular area
  if (req.query.bbox) {
    filters.push({
      $match: {
        $or: toArray(req.query.bbox).map(bbox => {

          const parts = bbox.split(',');
          if (parts.length !== 4) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must be a comma-delimited string of 4 numbers (longitude and latitude of south-west corner, and longitude and latitude of north-east corner), but it has ${parts.length} parts`);
          }

          const coordinates = parts.map(part => parseFloat(part, 10));
          const notNumbers = coordinates.filter(number => !isFinite(number));
          if (notNumbers.length) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must be a comma-delimited string of 4 numbers (longitude and latitude of south-west corner, and longitude and latitude of north-east corner), but some of its values are not numbers: ${notNumbers.map(value => `"${value}"`).join(', ')}`);
          }

          if (coordinates[0] < -180 || coordinates[0] > 180) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must have a longitude between -180 and 180 as its first number, but the value is ${coordinates[0]}`);
          } else if (coordinates[1] < -90 || coordinates[1] > 90) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must have a latitude between -90 and 90 as its second number, but the value is ${coordinates[1]}`);
          } else if (coordinates[2] < -180 || coordinates[2] > 180) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must have a longitude between -180 and 180 as its third number, but the value is ${coordinates[2]}`);
          } else if (coordinates[3] < -90 || coordinates[3] > 90) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must have a latitude between -90 and 90 as its fourth number, but the value is ${coordinates[3]}`);
          } else if (coordinates[0] > coordinates[2]) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must have a south-west longitude smaller than its north-east longitude, but their values are ${coordinates[0]} > ${coordinates[2]}`);
          } else if (coordinates[1] > coordinates[3]) {
            throw invalidQueryParamError('bbox', `Query parameter "bbox" must have a south-west latitude smaller than its north-east latitude, but their values are ${coordinates[1]} > ${coordinates[3]}`);
          }

          return {
            location: {
              $geoWithin: {
                $geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [ coordinates[0], coordinates[1] ], // SW
                      [ coordinates[2], coordinates[1] ], // SE
                      [ coordinates[2], coordinates[3] ], // NE
                      [ coordinates[0], coordinates[3] ], // NW
                      [ coordinates[0], coordinates[1] ]  // SW (close the polygon)
                    ]
                  ]
                }
              }
            }
          };
        })
      }
    });
  }

  // "near" query param filter to select places near a geographical point
  if (req.query.near) {
    filters.push({
      $match: {
        $or: toArray(req.query.near).map(bbox => {

          const near = req.query.near;
          const parts = near.split(',');
          if (parts.length < 3 || parts.length > 4) {
            throw invalidQueryParamError('near', `Query parameter "near" must be a comma-delimited string of 3 or 4 numbers (longitude, latitude, optional altitude and distance), but it has ${parts.length} parts`);
          }

          const numbers = parts.map(part => parseFloat(part, 10));
          const notNumbers = numbers.filter(number => !isFinite(number));
          if (notNumbers.length) {
            throw invalidQueryParamError('near', `Query parameter "near" must be a comma-delimited string of 3 or 4 numbers (longitude, latitude, optional altitude and distance), but some of its values are not numbers: ${notNumbers.map(value => `"${value}"`).join(', ')}`);
          }

          if (numbers[0] < -180 || numbers[0] > 180) {
            throw invalidQueryParamError('near', `Query parameter "near" must have a longitude between -180 and 180 as its first number, but the value is ${numbers[0]}`);
          } else if (numbers[1] < -90 || numbers[1] > 90) {
            throw invalidQueryParamError('near', `Query parameter "near" must have a latitude between -90 and 90 as its second number, but the value is ${numbers[1]}`);
          }

          const maxDistance = numbers.pop();
          if (maxDistance <= 0) {
            throw invalidQueryParamError('near', `Query parameter "near" must have a distance greater than zero as its last number, but the value is ${maxDistance}`);
          }

          const geometry = {
            type: 'Point',
            coordinates: numbers
          };

          return {
            location: {
              $geoWithin: {
                $centerSphere: [ numbers, maxDistance / 6371000 ]
              }
            }
          };
        })
      }
    });
  }

  // "href" query param filter to select places by href (exact match)
  if (req.query.href) {
    filters.push({
      $match: {
        apiId: { $in: toArray(req.query.href).map(value => value.replace(new RegExp(`^${escapeRegExp(`${Place.apiResource}/`)}`), '')) }
      }
    });
  }

  // "id" query param filter to select places by API ID (exact match)
  if (req.query.id) {
    filters.push({
      $match: {
        apiId: { $in: toArray(req.query.id) }
      }
    });
  }

  // "name" query param filter to select places by name (exact match)
  if (req.query.name) {
    filters.push({
      $match: {
        $or: toArray(req.query.name).map(value => ({
          name: new RegExp(`^${escapeRegExp(value)}$`, 'i')
        }))
      }
    });
  }

  // "search" query param filter to select places with a name or description that contains the search term (case-insensitive)
  if (req.query.search) {
    filters.push({
      $match: {
        $or: toArray(req.query.search).reduce((memo, value) => [
          ...memo,
          {
            name: new RegExp(escapeRegExp(value), 'i')
          },
          {
            description: new RegExp(escapeRegExp(value), 'i')
          }
        ], [])
      }
    });
  }

  return filters;
}

const sortPlacesPipeline = sortPipelineFactory({
  allowed: [
    'createdAt', 'name', 'updatedAt',
    {
      href: 'apiId',
      id: 'apiId',
      'trip.href': 'tripProperties.apiId',
      'trip.id': 'tripProperties.apiId',
      'trip.title': 'tripProperties.title'
    }
  ],
  default: 'createdAt',
  required: 'createdAt'
});

function placeNotFound(id) {
  return createError(404, 'recordNotFound', `No place found with ID ${id}`);
}
