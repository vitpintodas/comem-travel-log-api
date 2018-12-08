const config = require('../../config');
const Trip = require('../../models/trip');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');

exports.createTrip = route(async (req, res) => {

  const trip = new Trip().parseFrom(req.body);
  trip.user = req.currentUser.id;

  await trip.save();
  await trip.populate('user').execPopulate();

  res
    .status(201)
    .set('Location', config.joinUrl(trip.href))
    .send(trip);
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
});

exports.removeTrip = route(async (req, res) => {
  await req.trip.remove();
  res.sendStatus(204);
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
