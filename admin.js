'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db/pool');

// Basic unauthenticated admin route for simplicity as requested
// In a real app, you would add an admin authentication middleware here.

// -------------------------
// STATS
// -------------------------
router.get('/stats', async (req, res) => {
  try {
    const modulesRes = await db.query('SELECT COUNT(*) as count FROM modules');
    const accessCodesRes = await db.query('SELECT COUNT(*) as count FROM access_codes');
    const sessionsRes = await db.query('SELECT COUNT(*) as count FROM sessions');
    const resultsRes = await db.query('SELECT COUNT(*) as count FROM results');

    res.json({
      modulesCount: modulesRes.rows[0].count,
      accessCodesCount: accessCodesRes.rows[0].count,
      sessionsCount: sessionsRes.rows[0].count,
      resultsCount: resultsRes.rows[0].count,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// -------------------------
// MODULES
// -------------------------
router.get('/modules', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM modules ORDER BY title ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// -------------------------
// ACCESS CODES
// -------------------------
router.get('/access-codes', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM access_codes ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching access codes:', error);
    res.status(500).json({ error: 'Failed to fetch access codes' });
  }
});

router.post('/access-codes', async (req, res) => {
  const { code, label, allowed_modules, max_uses, expires_at } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO access_codes (code, label, allowed_modules, max_uses, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [code, label || null, JSON.stringify(allowed_modules || []), max_uses || null, expires_at || null]
    );
    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating access code:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Access code already exists' });
    }
    res.status(500).json({ error: 'Failed to create access code' });
  }
});

router.put('/access-codes/:id', async (req, res) => {
  const { id } = req.params;
  const { code, label, allowed_modules, max_uses, expires_at, is_active } = req.body;
  
  try {
    await db.query(
      `UPDATE access_codes 
       SET code = ?, label = ?, allowed_modules = ?, max_uses = ?, expires_at = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        code, 
        label, 
        JSON.stringify(allowed_modules || []), 
        max_uses || null, 
        expires_at || null, 
        is_active === false ? 0 : 1, 
        id
      ]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating access code:', error);
    res.status(500).json({ error: 'Failed to update access code' });
  }
});

// -------------------------
// SESSIONS
// -------------------------
router.get('/sessions', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.id, s.token, s.module_slug, s.status, s.last_active_at, s.created_at, ac.code as access_code
      FROM sessions s
      LEFT JOIN access_codes ac ON s.access_code_id = ac.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// -------------------------
// RESULTS
// -------------------------
router.get('/results', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.id, r.session_id, r.module_slug, r.scores, r.summary, r.created_at, s.token as session_token
      FROM results r
      LEFT JOIN sessions s ON r.session_id = s.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = router;
