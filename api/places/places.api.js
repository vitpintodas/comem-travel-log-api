const config = require('../../config');
const Place = require('../../models/place');
const { forbiddenError } = require('../../utils/auth');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');

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

  const places = await Place.find().sort('name').populate(POPULATE);

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

function placeNotFound(id) {
  return createError(404, 'recordNotFound', `No place found with ID ${id}`);
}
