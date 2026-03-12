const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../vault.db');
const db = new Database(dbPath, { verbose: null }); // Disable verbose in prod
db.pragma('journal_mode = WAL');

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      encrypted_data TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER,
      expires_at INTEGER
    );
  `);
};
initDb();

module.exports = db;
