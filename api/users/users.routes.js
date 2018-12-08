const express = require('express');

const { canModify, createUser, loadUserById, removeUser, retrieveAllUsers, retrieveUser, updateUser } = require('./users.api');
const { authenticate, authorize } = require('../../utils/auth');

const router = express.Router();

// POST /api/users
router.post('/',
  createUser);

// GET /api/users
router.get('/',
  retrieveAllUsers);

// GET /api/users/:id
router.get('/:id',
  loadUserById,
  retrieveUser);

// PATCH /api/users/:id
router.patch('/:id',
  authenticate,
  loadUserById,
  authorize(canModify),
  updateUser);

// DELETE /api/users/:id
router.delete('/:id',
  authenticate,
  loadUserById,
  authorize(canModify),
  removeUser);

module.exports = router;
