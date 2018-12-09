const config = require('../../config');
const User = require('../../models/user');
const { createError } = require('../../utils/errors');
const { route } = require('../../utils/express');

const usersLogger = config.logger('api:users');

exports.createUser = route(async (req, res) => {

  const user = new User().parseFrom(req.body);
  await user.setPassword(req.body.password);
  await user.save();

  res
    .status(201)
    .set('Location', config.joinUrl(user.href))
    .send(user);

  usersLogger.info(`Created user ${user.apiId} named "${user.name}"`);
});

exports.retrieveAllUsers = route(async (req, res) => {

  const users = await User.find().sort('name');

  res.send(users);
});

exports.retrieveUser = route(async (req, res) => {
  res.send(req.user);
});

exports.updateUser = route(async (req, res) => {

  const user = req.user;
  user.parseFrom(req.body);
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
});

exports.canModify = function(req) {
  return req.currentUser && req.user && req.currentUser.apiId === req.user.apiId;
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

  req.user = user;
  next();
});

function userNotFound(id) {
  return createError(404, 'recordNotFound', `No user found with ID ${id}`);
}
