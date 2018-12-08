const express = require('express');

const { canModify, createTrip, loadTripById, removeTrip, retrieveAllTrips, retrieveTrip, updateTrip } = require('./trips.api');
const { authenticate, authorize } = require('../../utils/auth');

const router = express.Router();

// POST /api/trips
router.post('/',
  authenticate,
  createTrip);

// GET /api/trips
router.get('/',
  retrieveAllTrips);

// GET /api/trips/:id
router.get('/:id',
  loadTripById,
  retrieveTrip);

// PATCH /api/trips/:id
router.patch('/:id',
  authenticate,
  loadTripById,
  authorize(canModify),
  updateTrip);

// DELETE /api/trips/:id
router.delete('/:id',
  authenticate,
  loadTripById,
  authorize(canModify),
  removeTrip);

module.exports = router;
