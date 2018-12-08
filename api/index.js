const express = require('express');

const { version } = require('../config');
const usersRouter = require('./users/users.routes');

const router = express.Router();

// GET /api
router.get('/', (req, res) => res.send({ version }));

// Routes under /api/users
router.use('/users', usersRouter);

module.exports = router;
