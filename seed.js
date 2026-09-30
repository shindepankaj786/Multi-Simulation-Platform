'use strict';

require('dotenv').config();
const { query, db } = require('./pool');

const MODULES = [
  {
    slug: 'leadership-uncertainty',
    title: 'Leadership Through Uncertainty',
    description: 'Participants navigate complex, ambiguous scenarios.',
    category: 'Leadership',
    icon: 'compass',
    config: { maxTurns: 20, timerMinutes: 45, scoringDimensions: ['clarity', 'decisiveness'] },
  },
  {
    slug: 'supervisory-skills',
    title: 'Supervisory Skills Simulation',
    description: 'Practice supervisory conversations with Latifa, Ahmed, Shamma, and Khaled.',
    category: 'Management',
    icon: 'users',
    config: { maxTurns: 25, timerMinutes: 60, scoringDimensions: ['communication', 'coaching'] },
  },
];

const ACCESS_CODES = [
  {
    code: 'DEMO-2026',
    label: 'Demo Access — All Modules',
    allowed_modules: MODULES.map((m) => m.slug),
    max_uses: null,
  }
];

async function seed() {
  try {
    await query('BEGIN TRANSACTION');

    // Upsert modules using SQLite syntax: INSERT ... ON CONFLICT DO UPDATE
    for (const m of MODULES) {
      await query(
        `INSERT INTO modules (slug, title, description, category, icon, config)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (slug) DO UPDATE SET
           title = excluded.title,
           description = excluded.description,
           category = excluded.category,
           icon = excluded.icon,
           config = excluded.config,
           updated_at = CURRENT_TIMESTAMP`,
        [m.slug, m.title, m.description, m.category, m.icon, JSON.stringify(m.config)]
      );
      console.log(`[seed] Module: ${m.slug}`);
    }

    // Upsert access codes
    for (const ac of ACCESS_CODES) {
      await query(
        `INSERT INTO access_codes (code, label, allowed_modules, max_uses)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (code) DO UPDATE SET
           label = excluded.label,
           allowed_modules = excluded.allowed_modules,
           max_uses = excluded.max_uses,
           updated_at = CURRENT_TIMESTAMP`,
        [ac.code, ac.label, JSON.stringify(ac.allowed_modules), ac.max_uses]
      );
      console.log(`[seed] Access code: ${ac.code}`);
    }

    await query('COMMIT');
    console.log('\n[seed] ✓ Done.');
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('[seed] ERROR:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

seed();
