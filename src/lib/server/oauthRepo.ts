import crypto from "node:crypto";
import { ensureSchema, sql } from "./db";

const CODE_TTL_MS = 5 * 60 * 1000;

export interface OAuthClient {
  clientId: string;
  clientName: string;
  redirectUris: string[];
}

export async function registerClient(clientName: string, redirectUris: string[]): Promise<OAuthClient> {
  await ensureSchema();
  const clientId = crypto.randomBytes(16).toString("base64url");
  await sql()`
    INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at)
    VALUES (${clientId}, ${clientName}, ${JSON.stringify(redirectUris)}, ${Date.now()})
  `;
  return { clientId, clientName, redirectUris };
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT client_id, client_name, redirect_uris FROM oauth_clients WHERE client_id = ${clientId}
  `) as { client_id: string; client_name: string; redirect_uris: string }[];
  const row = rows[0];
  if (!row) return null;
  let redirectUris: string[];
  try {
    redirectUris = JSON.parse(row.redirect_uris);
  } catch {
    redirectUris = [];
  }
  return { clientId: row.client_id, clientName: row.client_name, redirectUris };
}

/** Creates a short-lived authorization code binding a user, client, redirect_uri, and PKCE challenge together. */
export async function createAuthCode(
  userId: string,
  clientId: string,
  redirectUri: string,
  codeChallenge: string
): Promise<string> {
  await ensureSchema();
  const code = crypto.randomBytes(24).toString("base64url");
  const now = Date.now();
  await sql()`
    INSERT INTO oauth_codes (code, user_id, client_id, redirect_uri, code_challenge, created_at, expires_at)
    VALUES (${code}, ${userId}, ${clientId}, ${redirectUri}, ${codeChallenge}, ${now}, ${now + CODE_TTL_MS})
  `;
  return code;
}

export interface ConsumedAuthCode {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
}

/** Single-use: deletes the code as part of reading it, so it can never be redeemed twice. Returns null if missing/expired. */
export async function consumeAuthCode(code: string): Promise<ConsumedAuthCode | null> {
  await ensureSchema();
  const rows = (await sql()`
    DELETE FROM oauth_codes WHERE code = ${code}
    RETURNING user_id, client_id, redirect_uri, code_challenge, expires_at
  `) as { user_id: string; client_id: string; redirect_uri: string; code_challenge: string; expires_at: number }[];
  const row = rows[0];
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) return null;
  return { userId: row.user_id, clientId: row.client_id, redirectUri: row.redirect_uri, codeChallenge: row.code_challenge };
}

/** RFC 7636 PKCE (S256 only) — true if codeVerifier hashes to codeChallenge. */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return computed === codeChallenge;
}
