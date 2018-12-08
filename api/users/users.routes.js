const express = require('express');

const { createUser, loadUserById, removeUser, retrieveAllUsers, retrieveUser, updateUser } = require('./users.api');

const router = express.Router();

// POST /api/users
router.post('/', createUser);

// GET /api/users
router.get('/', retrieveAllUsers);

// GET /api/users/:id
router.get('/:id', loadUserById, retrieveUser);

// PATCH /api/users/:id
router.patch('/:id', loadUserById, updateUser);

// DELETE /api/users/:id
router.delete('/:id', loadUserById, removeUser);

module.exports = router;
