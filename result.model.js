'use strict';

const db = require('../db/pool');

function parseResult(row) {
  if (row && typeof row.scores === 'string') {
    row.scores = JSON.parse(row.scores);
  }
  if (row && typeof row.raw_data === 'string') {
    row.raw_data = JSON.parse(row.raw_data);
  }
  return row;
}

const ResultModel = {
  async create({ sessionId, moduleSlug, scores = {}, summary = '', rawData = {} }) {
    const res = await db.query(
      `INSERT INTO results (session_id, module_slug, scores, summary, raw_data, evaluated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [sessionId, moduleSlug, JSON.stringify(scores), summary, JSON.stringify(rawData)]
    );
    const getRes = await db.query(`SELECT * FROM results WHERE id = ?`, [res.lastID]);
    return parseResult(getRes.rows[0]);
  },

  async findBySession(sessionId) {
    const res = await db.query(
      `SELECT * FROM results WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );
    return parseResult(res.rows[0]) || null;
  }
};

module.exports = ResultModel;
