const express = require('express');

const { createAuthenticationToken } = require('./auth.api');

const router = express.Router();

// POST /api/auth
router.post('/', createAuthenticationToken);

module.exports = router;
