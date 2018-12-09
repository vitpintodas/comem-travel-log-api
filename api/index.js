const express = require('express');

const { version } = require('../config');
const authRoutes = require('./auth/auth.routes');
const placesRoutes = require('./places/places.routes');
const tripsRoutes = require('./trips/trips.routes');
const usersRoutes = require('./users/users.routes');

const router = express.Router();

// GET /api
router.get('/', (req, res) => res.send({ version }));

router.use('/auth', authRoutes);
router.use('/places', placesRoutes);
router.use('/trips', tripsRoutes);
router.use('/users', usersRoutes);

module.exports = router;
