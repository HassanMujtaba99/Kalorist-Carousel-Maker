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

  // MCP access tokens — let a remote MCP tool call (no browser cookie) prove
  // which account it's acting on. Only a salted hash is ever stored; the
  // plaintext token is shown once at creation and never persisted.
  await db`
    CREATE TABLE IF NOT EXISTS mcp_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      last_used_at BIGINT
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user ON mcp_tokens(user_id)`;

  // Reference images uploaded via the website widget, referenced from a
  // Claude conversation by their short tag instead of pasting a raw data URL.
  await db`
    CREATE TABLE IF NOT EXISTS mcp_images (
      tag TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data_base64 TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS idx_mcp_images_user ON mcp_images(user_id)`;
  // Added when the image library page shipped — a human-readable name lets
  // both the user and Claude refer to an upload by more than its tag.
  await db`ALTER TABLE mcp_images ADD COLUMN IF NOT EXISTS label TEXT`;

  // Minimal OAuth 2.1 authorization server (RFC 7591 dynamic client
  // registration + authorization code + PKCE) so MCP clients that only
  // support OAuth login (e.g. claude.ai's web Connectors UI, which has no
  // field for a manually-configured header) can link an account too.
  // Public clients only — no client_secret, PKCE (S256) is the only proof.
  await db`
    CREATE TABLE IF NOT EXISTS oauth_clients (
      client_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      redirect_uris TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;

  // Short-lived, single-use authorization codes exchanged at the token
  // endpoint. Deleted immediately on use (see consumeAuthCode).
  await db`
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    )
  `;
}

/** Runs the CREATE TABLE IF NOT EXISTS migration once per warm instance. */
export function ensureSchema(): Promise<void> {
  if (!global.__kaloristSchemaReady) {
    global.__kaloristSchemaReady = createSchema();
  }
  return global.__kaloristSchemaReady;
}
