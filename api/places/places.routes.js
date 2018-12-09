const express = require('express');

const { canModify, createPlace, loadPlaceById, removePlace, retrieveAllPlaces, retrievePlace, updatePlace } = require('./places.api');
const { authenticate, authorize } = require('../../utils/auth');

const router = express.Router();

// POST /api/places
router.post('/',
  authenticate,
  createPlace);

// GET /api/places
router.get('/',
  retrieveAllPlaces);

// GET /api/places/:id
router.get('/:id',
  loadPlaceById,
  retrievePlace);

// PATCH /api/places/:id
router.patch('/:id',
  authenticate,
  loadPlaceById,
  authorize(canModify),
  updatePlace);

// DELETE /api/places/:id
router.delete('/:id',
  authenticate,
  loadPlaceById,
  authorize(canModify),
  removePlace);

module.exports = router;
