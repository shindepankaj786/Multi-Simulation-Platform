'use strict';

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { db, getClient } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

async function migrate() {
  const client = await getClient();
  try {
    // Ensure the tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        applied_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] ✓ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] → Applying ${file} ...`);

      // SQLite run() doesn't handle multiple statements easily if there are parameters, 
      // but these migrations don't have parameters. Still, we split by ';' to be safe.
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      
      await client.query('BEGIN TRANSACTION');
      for (let stmt of statements) {
        await client.query(stmt);
      }
      
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [file]
      );
      await client.query('COMMIT');
      
      console.log(`[migrate] ✓ ${file} applied`);
      ran++;
    }

    if (ran === 0) {
      console.log('[migrate] All migrations are up to date.');
    } else {
      console.log(`[migrate] Applied ${ran} migration(s).`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[migrate] ERROR:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
