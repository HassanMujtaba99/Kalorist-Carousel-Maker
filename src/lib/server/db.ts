import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.db");

declare global {
  var __kaloristDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      gemini_api_key_enc TEXT,
      gemini_model TEXT,
      usda_api_key_enc TEXT,
      anthropic_api_key_enc TEXT,
      anthropic_model TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carousels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_carousels_user ON carousels(user_id);
  `);
  return db;
}

/**
 * Reused across hot reloads in dev (Next.js re-evaluates modules per
 * request in dev mode) and across serverless invocations that reuse the
 * same warm instance. NOTE: SQLite needs a persistent, writable filesystem
 * — this works for self-hosting (Docker/VPS/PM2) but NOT for stateless
 * serverless platforms like Vercel, where each instance's disk is ephemeral.
 * Point DATABASE_PATH at a mounted volume, or swap this module for a
 * hosted database, before deploying there.
 */
export function getDb(): Database.Database {
  if (!global.__kaloristDb) {
    global.__kaloristDb = createConnection();
  }
  return global.__kaloristDb;
}
