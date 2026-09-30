'use strict';

const db = require('../db/pool');

function parsePayload(row) {
  if (row && typeof row.payload === 'string') {
    row.payload = JSON.parse(row.payload);
  }
  return row;
}

const MessageModel = {
  async create({ sessionId, role, content, payload = {} }) {
    const seqRes = await db.query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq
       FROM messages WHERE session_id = ?`,
      [sessionId]
    );
    const nextSeq = seqRes.rows[0].next_seq;

    const res = await db.query(
      `INSERT INTO messages (session_id, role, content, payload, sequence_number)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, role, content, JSON.stringify(payload), nextSeq]
    );
    
    const getRes = await db.query(`SELECT * FROM messages WHERE id = ?`, [res.lastID]);
    return parsePayload(getRes.rows[0]);
  },

  async findBySession(sessionId) {
    const res = await db.query(
      `SELECT * FROM messages WHERE session_id = ? ORDER BY sequence_number ASC`,
      [sessionId]
    );
    return res.rows.map(parsePayload);
  },

  async countBySession(sessionId) {
    const res = await db.query(
      `SELECT COUNT(*) AS total FROM messages WHERE session_id = ?`,
      [sessionId]
    );
    return parseInt(res.rows[0].total, 10);
  },
};

module.exports = MessageModel;
