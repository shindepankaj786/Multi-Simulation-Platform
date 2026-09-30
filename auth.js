'use strict';

const express = require('express');
const router = express.Router();
const AccessCodeModel = require('../models/accessCode.model');
const SessionModel = require('../models/session.model');
const { requireAuth } = require('../middleware/sessionAuth');

// POST /api/auth/verify
// Validate access code and create a session
router.post('/verify', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Access code is required' });
  }

  try {
    // Removing access code validation per user request
    // const { valid, reason, record } = await AccessCodeModel.validate(code);
    
    // if (!valid) {
    //   return res.status(401).json({ 
    //     error: 'Please contact your facilitator for the current session access code.',
    //     detail: reason
    //   });
    // }

    // Fake record to allow all modules
    const record = { id: 1, allowed_modules: ['leadership-uncertainty', 'supervisory-skills'] };

    // Create session
    const session = await SessionModel.create({
      accessCodeId: record.id,
      metadata: { userAgent: req.get('User-Agent') }
    });

    // Increment use count
    await AccessCodeModel.incrementUseCount(record.id);

    // Set cookie
    const cookieMaxAge = parseInt(process.env.COOKIE_MAX_AGE_MS || '86400000', 10);
    res.cookie('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge
    });

    res.json({ success: true, allowedModules: record.allowed_modules });
  } catch (err) {
    console.error('[Auth Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/session
// Get current session info
router.get('/session', requireAuth, (req, res) => {
  res.json({
    id: req.session.id,
    access_code: req.session.access_code,
    allowed_modules: req.session.allowed_modules,
    module_slug: req.session.module_slug,
    status: req.session.status
  });
});

// DELETE /api/auth/session
// End session explicitly
router.delete('/session', requireAuth, async (req, res) => {
  try {
    await SessionModel.end(req.session.token);
    res.clearCookie('session_token');
    res.json({ success: true });
  } catch (err) {
    console.error('[Auth Route] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
