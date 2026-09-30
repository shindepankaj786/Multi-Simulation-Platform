'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../cornerstone.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");
});

/**
 * Wraps sqlite3 queries into a Promise matching pg pool structure somewhat.
 * @param {string} text  SQL statement (using $1, $2 or ?, ?)
 * @param {Array}  params  Parameterised values
 */
function query(text, params = []) {
  // Replace pg positional params $1, $2 with sqlite positional ? 
  // ONLY if not already using ?
  let sqliteText = text;
  if (text.includes('$1')) {
    // Simple naive replace since our queries are predictable
    sqliteText = text.replace(/\$\d+/g, '?');
  }

  return new Promise((resolve, reject) => {
    const isSelect = text.trim().toUpperCase().startsWith('SELECT') || text.trim().toUpperCase().startsWith('PRAGMA');
    
    if (isSelect) {
      db.all(sqliteText, params, function (err, rows) {
        if (err) return reject(err);
        resolve({ rows, rowCount: rows.length });
      });
    } else {
      db.run(sqliteText, params, function (err) {
        if (err) return reject(err);
        resolve({ 
          rowCount: this.changes, 
          lastID: this.lastID 
        });
      });
    }
  });
}

/**
 * Mock getClient for transactions (sqlite runs serially anyway, but we'll mock the interface)
 */
async function getClient() {
  return {
    query,
    release: () => {},
  };
}

module.exports = { query, getClient, db };
