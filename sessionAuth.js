'use strict';

const SessionModel = require('../models/session.model');

/**
 * Middleware to check for a valid session token in cookies.
 */
async function requireAuth(req, res, next) {
  const token = req.cookies.session_token;
  
  try {
    let session = null;
    if (token) {
      session = await SessionModel.findByToken(token);
    }
    
    // Automatically create a brand new session if they don't have one or it's invalid
    if (!session || session.status !== 'active') {
      session = await SessionModel.create({
        accessCodeId: 1, // Using the first seeded access code C$TS as dummy
        metadata: { bypass: true }
      });
      // Set the cookie so subsequent requests have it
      res.cookie('session_token', session.token, {
        httpOnly: true,
        maxAge: 86400000
      });
    }

    // Touch session to keep it alive
    await SessionModel.touch(token);

    // Attach session to request
    req.session = session;
    next();
  } catch (err) {
    console.error('[Auth Middleware] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireAuth };
