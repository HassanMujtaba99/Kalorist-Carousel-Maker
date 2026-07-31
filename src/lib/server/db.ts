import { neon } from "@neondatabase/serverless";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Create a Postgres database (e.g. `npx neonctl@latest init` at neon.tech) and add its connection string to your environment."
    );
  }
  return url;
}

declare global {
  var __kaloristSql: ReturnType<typeof neon> | undefined;
  var __kaloristSchemaReady: Promise<void> | undefined;
}

/** Lazy, memoized HTTP-based Postgres client (no persistent connection to pool — safe across serverless invocations). */
export function sql() {
  if (!global.__kaloristSql) {
    global.__kaloristSql = neon(getConnectionString());
  }
  return global.__kaloristSql;
}

async function createSchema(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      gemini_api_key_enc TEXT,
      gemini_model TEXT,
      usda_api_key_enc TEXT,
      anthropic_api_key_enc TEXT,
      anthropic_model TEXT,
      updated_at BIGINT NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS carousels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_carousels_user ON carousels(user_id)`;
}

/** Runs the CREATE TABLE IF NOT EXISTS migration once per warm instance. */
export function ensureSchema(): Promise<void> {
  if (!global.__kaloristSchemaReady) {
    global.__kaloristSchemaReady = createSchema();
  }
  return global.__kaloristSchemaReady;
}
