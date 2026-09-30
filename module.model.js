'use strict';

const db = require('../db/pool');

function parseConfig(row) {
  if (row && row.config && typeof row.config === 'string') {
    row.config = JSON.parse(row.config);
  }
  return row;
}

const ModuleModel = {
  async findAll(slugs = null) {
    let rows = [];
    if (slugs && slugs.length > 0) {
      const placeholders = slugs.map(() => '?').join(',');
      const res = await db.query(
        `SELECT * FROM modules WHERE is_active = 1 AND slug IN (${placeholders}) ORDER BY title`,
        slugs
      );
      rows = res.rows;
    } else {
      const res = await db.query(
        `SELECT * FROM modules WHERE is_active = 1 ORDER BY category, title`
      );
      rows = res.rows;
    }
    return rows.map(parseConfig);
  },

  async findBySlug(slug) {
    const res = await db.query(
      `SELECT * FROM modules WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [slug]
    );
    return parseConfig(res.rows[0]) || null;
  }
};

module.exports = ModuleModel;
