'use strict';

const db = require('../db/pool');
const crypto = require('crypto');

function parseMetadata(row) {
  if (row && typeof row.metadata === 'string') {
    row.metadata = JSON.parse(row.metadata);
  }
  if (row && typeof row.allowed_modules === 'string') {
    row.allowed_modules = JSON.parse(row.allowed_modules);
  }
  return row;
}

const SessionModel = {
  async create({ accessCodeId, moduleSlug = null, metadata = {} }) {
    const token = crypto.randomUUID();
    const res = await db.query(
      `INSERT INTO sessions (token, access_code_id, module_slug, metadata)
       VALUES (?, ?, ?, ?)`,
      [token, accessCodeId, moduleSlug, JSON.stringify(metadata)]
    );
    return this.findById(res.lastID);
  },

  async findByToken(token) {
    const res = await db.query(
      `SELECT s.*, ac.allowed_modules, ac.code AS access_code
       FROM sessions s
       JOIN access_codes ac ON ac.id = s.access_code_id
       WHERE s.token = ? LIMIT 1`,
      [token]
    );
    return parseMetadata(res.rows[0]) || null;
  },

  async touch(token) {
    await db.query(
      `UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE token = ?`,
      [token]
    );
  },

  async setModule(token, moduleSlug) {
    await db.query(
      `UPDATE sessions SET module_slug = ?, last_active_at = CURRENT_TIMESTAMP
       WHERE token = ?`,
      [moduleSlug, token]
    );
    return this.findByToken(token);
  },

  async end(token) {
    await db.query(
      `UPDATE sessions
       SET status = 'completed', ended_at = CURRENT_TIMESTAMP, last_active_at = CURRENT_TIMESTAMP
       WHERE token = ?`,
      [token]
    );
  },

  async findById(id) {
    const res = await db.query(`SELECT * FROM sessions WHERE id = ? LIMIT 1`, [id]);
    return parseMetadata(res.rows[0]) || null;
  },
};

module.exports = SessionModel;
