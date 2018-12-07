const express = require('express');
const mongoose = require('mongoose');

const config = require('../config');
const User = require('../models/user');
const { createError } = require('../utils/errors');
const { route } = require('../utils/express');

const router = express.Router();

const loadUserById =  route(async (req, res, next) => {

  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(userNotFound(id));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(userNotFound(id));
  }

  req.user = user;
  next();
});

// POST /api/users
router.post('/', route(async (req, res) => {

  const user = new User(User.parse(req.body));
  await user.setPassword(req.body.password);
  await user.save();

  res
    .status(201)
    .set('Location', config.joinUrl(`/api/users/${user.id}`))
    .send(user);
}));

// GET /api/users
router.get('/', route(async (req, res) => {

  const users = await User.find().sort('name');

  res.send(users);
}));

// GET /api/users/:id
router.get('/:id', loadUserById, route(async (req, res) => {
  res.send(req.user);
}));

// PATCH /api/users/:id
router.patch('/:id', loadUserById, route(async (req, res) => {

  req.user.set(User.parse(req.body));
  if (req.body.password) {
    await req.user.setPassword(req.body.password);
  }

  await req.user.save();

  res.send(req.user);
}));

// DELETE /api/users/:id
router.delete('/:id', loadUserById, route(async (req, res) => {
  await req.user.remove();
  res.sendStatus(204);
}));

function userNotFound(id) {
  return createError(404, 'record.notFound', `No user found with ID ${id}`);
}

module.exports = router;
