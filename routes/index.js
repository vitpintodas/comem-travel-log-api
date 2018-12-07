const express = require('express');

const { version } = require('../config');
const { createError } = require('../utils/errors');

const router = express.Router();

// GET /
router.get('/', (req, res, next) => res.set('Content-Type', 'text/plain').send('Travel Log'));

// GET /api
router.get('/api', (req, res, next) => res.send({ version }));

module.exports = router;
