import crypto from "node:crypto";
import { ensureSchema, sql } from "./db";

export interface McpTokenSummary {
  id: string;
  label: string;
  createdAt: number;
  lastUsedAt: number | null;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Returns the plaintext token — shown once, never recoverable afterwards. */
export async function createMcpToken(userId: string, label: string): Promise<{ id: string; token: string }> {
  await ensureSchema();
  const id = crypto.randomUUID();
  const token = `kal_mcp_${crypto.randomBytes(24).toString("base64url")}`;
  await sql()`
    INSERT INTO mcp_tokens (id, user_id, token_hash, label, created_at)
    VALUES (${id}, ${userId}, ${hashToken(token)}, ${label || "MCP token"}, ${Date.now()})
  `;
  return { id, token };
}

export async function listMcpTokens(userId: string): Promise<McpTokenSummary[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, label, created_at, last_used_at FROM mcp_tokens
    WHERE user_id = ${userId} ORDER BY created_at DESC
  `) as { id: string; label: string; created_at: number; last_used_at: number | null }[];
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    createdAt: Number(r.created_at),
    lastUsedAt: r.last_used_at == null ? null : Number(r.last_used_at),
  }));
}

export async function revokeMcpToken(userId: string, id: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    DELETE FROM mcp_tokens WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

/** Resolves a bearer token (as passed into an MCP tool call) to the account it belongs to. */
export async function resolveMcpToken(token: string): Promise<{ userId: string } | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  await ensureSchema();
  const rows = (await sql()`
    SELECT id, user_id FROM mcp_tokens WHERE token_hash = ${hashToken(trimmed)}
  `) as { id: string; user_id: string }[];
  const row = rows[0];
  if (!row) return null;
  // Best-effort — don't block the caller's request on this write.
  sql()`UPDATE mcp_tokens SET last_used_at = ${Date.now()} WHERE id = ${row.id}`.catch(() => {});
  return { userId: row.user_id };
}
