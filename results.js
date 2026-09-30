'use strict';

const express = require('express');
const router = express.Router();
const ResultModel = require('../models/result.model');
const { requireAuth } = require('../middleware/sessionAuth');

// POST /api/results
// Store session result
router.post('/', requireAuth, async (req, res) => {
  const { scores, summary, rawData } = req.body;
  const sessionId = req.session.id;
  const moduleSlug = req.session.module_slug;

  if (!moduleSlug) {
    return res.status(400).json({ error: 'Session is not associated with a module' });
  }

  try {
    const result = await ResultModel.create({
      sessionId,
      moduleSlug,
      scores: scores || {},
      summary: summary || '',
      rawData: rawData || {}
    });
    res.json(result);
  } catch (err) {
    console.error('[Results Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/results
// Get results for current session
router.get('/', requireAuth, async (req, res) => {
  const sessionId = req.session.id;

  try {
    const result = await ResultModel.findBySession(sessionId);
    if (!result) {
      return res.status(404).json({ error: 'Result not found for this session' });
    }
    res.json(result);
  } catch (err) {
    console.error('[Results Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
