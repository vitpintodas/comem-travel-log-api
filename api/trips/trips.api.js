const { escapeRegExp } = require('lodash');

const config = require('../../config');
const Trip = require('../../models/trip');
const User = require('../../models/user');
const { addRelatedPropertyPipelineFactory, countRelatedPipelineFactory, paginate, sortPipelineFactory, toArray } = require('../../utils/api');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');
const { aggregateToDocuments } = require('../../utils/models');

const PIPELINE = [
  ...countRelatedPipelineFactory(Trip, 'Place'),
  ...addRelatedPropertyPipelineFactory(Trip, 'User', [ 'apiId', 'name' ])
];

const tripsLogger = config.logger('api:trips');

exports.createTrip = route(async (req, res) => {

  const trip = new Trip().parseFrom(req.body);
  trip.user = req.currentUser.id;

  await trip.save();
  await trip.populate('user').execPopulate();

  res
    .status(201)
    .set('Location', config.joinUrl(trip.href))
    .send(trip);

  tripsLogger.info(`Created trip ${trip.apiId} titled "${trip.title}" for user ${trip.user.apiId}`);
});

exports.retrieveAllTrips = route(async (req, res) => {

  const paginatedPipeline = await paginate(req, res, Trip, PIPELINE, createTripFilters);
  const sortedPipeline = await sortTripsPipeline(req, paginatedPipeline);
  const trips = await aggregateToDocuments(Trip, sortedPipeline);

  await Trip.populate(trips, 'user');

  res.send(trips.map(trip => trip.toJSON({ include: toArray(req.query.include) })));
});

exports.retrieveTrip = route(async (req, res) => {
  res.send(req.trip.toJSON({ include: toArray(req.query.include) }));
});

exports.updateTrip = route(async (req, res) => {

  const trip = req.trip;
  trip.parseFrom(req.body);

  await trip.save();

  res.send(trip);

  tripsLogger.info(`Updated trip ${trip.apiId} titled "${trip.title}"`);
});

exports.removeTrip = route(async (req, res) => {

  const trip = req.trip;
  await trip.remove();

  res.sendStatus(204);

  tripsLogger.info(`Removed trip ${trip.apiId} titled "${trip.title}"`);
});

exports.canModify = function(req) {
  return req.currentUser && req.trip && req.trip.user && req.currentUser.apiId === req.trip.user.apiId;
};

exports.loadTripById = route(async (req, res, next) => {

  const apiId = req.params.id;
  if (!apiId) {
    return next(tripNotFound(apiId));
  }

  const trip = await Trip.findOne({ apiId }).populate('user');
  if (!trip) {
    return next(tripNotFound(apiId));
  }

  req.trip = trip;
  next();
});

async function createTripFilters(req) {

  const filters = [];

  // "href" query param filter to select trips by href (exact match)
  if (req.query.href) {
    filters.push({
      $match: {
        $or: toArray(req.query.href).map(value => ({
          apiId: value.replace(new RegExp(`^${escapeRegExp(`${Trip.apiResource}/`)}`), '')
        }))
      }
    });
  }

  // "id" query param filter to select trips by API ID (exact match)
  if (req.query.id) {
    filters.push({
      $match: {
        apiId: { $in: toArray(req.query.id) }
      }
    });
  }

  // "title" query param filter to select trips by title (exact match)
  if (req.query.title) {
    filters.push({
      $match: {
        $or: toArray(req.query.title).map(value => ({
          title: new RegExp(`^${escapeRegExp(value)}$`, 'i')
        }))
      }
    });
  }

  // "search" query param filter to select trips with a title or description that contains the search term (case-insensitive)
  if (req.query.search) {
    filters.push({
      $match: {
        $or: toArray(req.query.search).reduce((memo, value) => [
          ...memo,
          {
            title: new RegExp(escapeRegExp(value), 'i')
          },
          {
            description: new RegExp(escapeRegExp(value), 'i')
          }
        ], [])
      }
    });
  }

  if (req.query.user) {

    const userIds = toArray(req.query.user);
    const users = await User.find({
      apiId: {
        $in: userIds
      }
    });

    filters.push({
      $match: {
        user: {
          $in: users.map(user => user._id)
        }
      }
    });
  }

  return filters;
}

const sortTripsPipeline = sortPipelineFactory({
  allowed: [
    'createdAt', 'title', 'placesCount', 'updatedAt',
    {
      href: 'apiId',
      id: 'apiId',
      'user.href': 'userProperties.apiId',
      'user.id': 'userProperties.apiId',
      'user.name': 'userProperties.name'
    }
  ],
  default: '-createdAt',
  required: '-createdAt'
});

function tripNotFound(id) {
  return createError(404, 'recordNotFound', `No trip found with ID ${id}`);
}
