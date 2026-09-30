'use strict';

const db = require('../db/pool');

function parseAllowedModules(row) {
  if (row && typeof row.allowed_modules === 'string') {
    row.allowed_modules = JSON.parse(row.allowed_modules);
  }
  return row;
}

const AccessCodeModel = {
  async findByCode(code) {
    const res = await db.query(
      `SELECT * FROM access_codes WHERE code = ? LIMIT 1`,
      [code.trim().toUpperCase()]
    );
    return parseAllowedModules(res.rows[0]) || null;
  },

  async validate(code) {
    const record = await this.findByCode(code);
    if (!record) return { valid: false, reason: 'Code not found', record: null };
    if (!record.is_active) return { valid: false, reason: 'Code is inactive', record };
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return { valid: false, reason: 'Code has expired', record };
    }
    if (record.max_uses !== null && record.use_count >= record.max_uses) {
      return { valid: false, reason: 'Code usage limit reached', record };
    }
    return { valid: true, reason: null, record };
  },

  async incrementUseCount(id) {
    await db.query(
      `UPDATE access_codes SET use_count = use_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  },
};

module.exports = AccessCodeModel;
