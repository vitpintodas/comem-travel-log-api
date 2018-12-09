const config = require('../../config');
const Trip = require('../../models/trip');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');

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

  const trips = await Trip.find().sort('title').populate('user');

  res.send(trips);
});

exports.retrieveTrip = route(async (req, res) => {
  res.send(req.trip);
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

function tripNotFound(id) {
  return createError(404, 'recordNotFound', `No trip found with ID ${id}`);
}
