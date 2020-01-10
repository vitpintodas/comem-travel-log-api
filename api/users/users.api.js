const { escapeRegExp, isArray } = require('lodash');
const mongoose = require('mongoose');

const config = require('../../config');
const User = require('../../models/user');
const { countRelatedPipelineFactory, paginate, sortPipelineFactory, toArray } = require('../../utils/api');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');
const { aggregateToDocuments } = require('../../utils/models');
const { onResourceCreated, onResourceRemoved } = require('../ws');

const PIPELINE = countRelatedPipelineFactory(User, 'Trip');

const usersLogger = config.logger('api:users');

exports.createUser = route(async (req, res) => {

  const user = new User().parseFrom(req.body);
  await user.setPassword(req.body.password);
  await user.save();
  user.tripsCount = 0;

  res
    .status(201)
    .set('Location', config.joinUrl(user.href))
    .send(user);

  usersLogger.info(`Created user ${user.apiId} named "${user.name}"`);

  onResourceCreated(user);
});

exports.retrieveAllUsers = route(async (req, res) => {

  const paginatedPipeline = await paginate(req, res, User, PIPELINE, createUserFilters);
  const sortedPipeline = await sortUsersPipeline(req, paginatedPipeline);
  const users = await aggregateToDocuments(User, sortedPipeline);

  res.send(users);
});

exports.retrieveUser = route(async (req, res) => {
  res.send(req.user);
});

exports.updateUser = route(async (req, res) => {

  const user = req.user;
  user.parseFrom(req.body);

  // TODO: require previous password
  if (req.body.password) {
    await user.setPassword(req.body.password);
  }

  await user.save();

  res.send(user);

  usersLogger.info(`Updated user ${user.apiId} named "${user.name}"`);
});

exports.removeUser = route(async (req, res) => {

  const user = req.user;
  await user.remove();

  res.sendStatus(204);

  usersLogger.info(`Removed user ${user.apiId} named "${user.name}"`);

  onResourceRemoved(user);
});

exports.canModify = function(req) {
  return req.currentUser && req.user && req.currentUser.apiId === req.user.apiId;
};

exports.addTripsCountToUser = async user => {
  user.tripsCount = await mongoose.model('Trip').count({ user: user._id });
};

exports.loadUserById = route(async (req, res, next) => {

  const apiId = req.params.id;
  if (!apiId) {
    return next(userNotFound(apiId));
  }

  const user = await User.findOne({ apiId });
  if (!user) {
    return next(userNotFound(apiId));
  }

  await exports.addTripsCountToUser(user);

  req.user = user;
  next();
});

async function createUserFilters(req) {

  const filters = [];

  // "href" query param filter to select users by href (exact match)
  if (req.query.href) {
    filters.push({
      $match: {
        $or: toArray(req.query.href).map(value => ({
          apiId: value.replace(new RegExp(`^${escapeRegExp(`${User.apiResource}/`)}`), '')
        }))
      }
    });
  }

  // "id" query param filter to select users by API ID (exact match)
  if (req.query.id) {
    filters.push({
      $match: {
        apiId: { $in: toArray(req.query.id) }
      }
    });
  }

  // "name" query param filter to select users by name (exact match)
  if (req.query.name) {
    filters.push({
      $match: {
        $or: toArray(req.query.name).map(value => ({
          name: new RegExp(`^${escapeRegExp(value)}$`, 'i')
        }))
      }
    });
  }

  // "search" query param filter to select users with a name that contains the search term (case-insensitive)
  if (req.query.search) {
    filters.push({
      $match: {
        $or: toArray(req.query.search).map(value => ({
          name: new RegExp(escapeRegExp(value), 'i')
        }))
      }
    });
  }

  return filters;
}

const sortUsersPipeline = sortPipelineFactory({
  allowed: [
    'createdAt', 'name', 'tripsCount', 'updatedAt',
    {
      href: 'apiId',
      id: 'apiId'
    }
  ],
  default: 'name',
  required: '-createdAt'
});

function userNotFound(id) {
  return createError(404, 'recordNotFound', `No user found with ID ${id}`);
}
