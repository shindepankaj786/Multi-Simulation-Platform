'use strict';

const express = require('express');
const router = express.Router();
const SessionModel = require('../models/session.model');
const ModuleModel = require('../models/module.model');
const { requireAuth } = require('../middleware/sessionAuth');
const MessageModel = require('../models/message.model');

// POST /api/sessions
// Start a simulation session for a specific module
router.post('/', requireAuth, async (req, res) => {
  const { moduleSlug } = req.body;

  if (!moduleSlug) {
    return res.status(400).json({ error: 'moduleSlug is required' });
  }

  // Bypassing allowed_modules check per user request
  // if (!req.session.allowed_modules.includes(moduleSlug)) {
  //   return res.status(403).json({ error: 'Access to this module is not allowed' });
  // }

  try {
    const mod = await ModuleModel.findBySlug(moduleSlug);
    if (!mod) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Reset session state for the new module start
    const db = require('../db/pool');
    await db.query(`DELETE FROM messages WHERE session_id = ?`, [req.session.id]);
    await db.query(`UPDATE sessions SET metadata = '{}', status = 'active' WHERE id = ?`, [req.session.id]);
    
    const updatedSession = await SessionModel.setModule(req.session.token, moduleSlug);

    // Insert the initial message for the module
    if (moduleSlug === 'leadership-uncertainty') {
      const LeadershipAssessment = require('../engine/leadershipAssessment');
      await MessageModel.create({
        sessionId: req.session.id,
        role: 'facilitator',
        content: LeadershipAssessment.INTRO_TEXT,
        payload: {}
      });
    } else if (moduleSlug === 'supervisory-skills') {
      await MessageModel.create({
        sessionId: req.session.id,
        role: 'facilitator',
        content: '*Latifa approaches your desk, looking slightly nervous but determined.*\n\n"Honestly, I’m here to learn being new in this bank and I expect a lot from you."',
        payload: { character: 'Latifa', new_state: 'neutral' }
      });
    }

    res.json({ success: true, session: updatedSession, module: mod });
  } catch (err) {
    console.error('[Sessions Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sessions/:id
// Get session detail by DB id
router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (req.session.id !== id) {
    return res.status(403).json({ error: 'Cannot access other sessions' });
  }

  res.json(req.session);
});

module.exports = router;
