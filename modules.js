'use strict';

const express = require('express');
const router = express.Router();
const ModuleModel = require('../models/module.model');
const { requireAuth } = require('../middleware/sessionAuth');

// GET /api/modules
// List modules allowed for the current session
router.get('/', requireAuth, async (req, res) => {
  try {
    const allowedSlugs = req.session.allowed_modules;
    const modules = await ModuleModel.findAll(allowedSlugs);
    res.json(modules);
  } catch (err) {
    console.error('[Modules Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
