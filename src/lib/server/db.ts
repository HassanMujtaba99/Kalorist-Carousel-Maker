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

/**
 * Identity is owned by Neon Auth (Stack Auth) now, not this schema — user_id
 * columns below just store their user id as plain text, with no local FK,
 * since that users table lives outside this database's control.
 */
async function createSchema(): Promise<void> {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      gemini_api_key_enc TEXT,
      gemini_model TEXT,
      usda_api_key_enc TEXT,
      anthropic_api_key_enc TEXT,
      anthropic_model TEXT,
      updated_at BIGINT NOT NULL
    )
  `;
  // Added when the copywriting provider picker was introduced — ADD COLUMN
  // IF NOT EXISTS so this migrates existing deployed tables in place rather
  // than only affecting fresh installs (CREATE TABLE IF NOT EXISTS above is
  // a no-op once the table already exists).
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS copy_provider TEXT`;
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS gemini_copy_model TEXT`;
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS openai_api_key_enc TEXT`;
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS openai_model TEXT`;
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_api_key_enc TEXT`;
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_model TEXT`;
  await db`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_base_url TEXT`;
  await db`
    CREATE TABLE IF NOT EXISTS carousels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_carousels_user ON carousels(user_id)`;
}

/** Runs the CREATE TABLE IF NOT EXISTS migration once per warm instance. */
export function ensureSchema(): Promise<void> {
  if (!global.__kaloristSchemaReady) {
    global.__kaloristSchemaReady = createSchema();
  }
  return global.__kaloristSchemaReady;
}
