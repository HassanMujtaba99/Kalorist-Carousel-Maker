import crypto from "node:crypto";
import { ensureSchema, sql } from "./db";

export interface McpImageSummary {
  tag: string;
  label: string;
  createdAt: number;
}

const dataUrlPattern = /^data:([^;]+);base64,(.+)$/;

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrlPattern.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function randomTag(): string {
  return `img_${crypto.randomBytes(6).toString("hex")}`;
}

/** Stores an uploaded image under the account and returns its short reference tag. */
export async function saveMcpImage(userId: string, dataUrl: string, label: string): Promise<string> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("Expected a data:image/...;base64,... URL.");
  await ensureSchema();

  for (let attempt = 0; attempt < 3; attempt++) {
    const tag = randomTag();
    try {
      await sql()`
        INSERT INTO mcp_images (tag, user_id, mime_type, data_base64, label, created_at)
        VALUES (${tag}, ${userId}, ${parsed.mimeType}, ${parsed.base64}, ${label || "Untitled"}, ${Date.now()})
      `;
      return tag;
    } catch (e) {
      // Unique-constraint collision on the tag — vanishingly unlikely, retry with a new one.
      if (attempt === 2) throw e;
    }
  }
  throw new Error("Could not allocate an image tag.");
}

/** Resolves a tag back to its data: URL, scoped to the requesting account. */
export async function getMcpImageByTag(userId: string, tag: string): Promise<string | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT mime_type, data_base64 FROM mcp_images WHERE tag = ${tag} AND user_id = ${userId}
  `) as { mime_type: string; data_base64: string }[];
  const row = rows[0];
  if (!row) return null;
  return `data:${row.mime_type};base64,${row.data_base64}`;
}

/** Raw mime/bytes for serving as an actual image response (thumbnails), rather than a data: URL string. */
export async function getMcpImageBytes(
  userId: string,
  tag: string
): Promise<{ mimeType: string; bytes: Buffer } | null> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT mime_type, data_base64 FROM mcp_images WHERE tag = ${tag} AND user_id = ${userId}
  `) as { mime_type: string; data_base64: string }[];
  const row = rows[0];
  if (!row) return null;
  return { mimeType: row.mime_type, bytes: Buffer.from(row.data_base64, "base64") };
}

export async function listMcpImages(userId: string): Promise<McpImageSummary[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT tag, label, created_at FROM mcp_images WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 200
  `) as { tag: string; label: string | null; created_at: number }[];
  return rows.map((r) => ({ tag: r.tag, label: r.label || "Untitled", createdAt: Number(r.created_at) }));
}

export async function renameMcpImage(userId: string, tag: string, label: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    UPDATE mcp_images SET label = ${label || "Untitled"} WHERE tag = ${tag} AND user_id = ${userId} RETURNING tag
  `) as { tag: string }[];
  return rows.length > 0;
}

export async function deleteMcpImage(userId: string, tag: string): Promise<boolean> {
  await ensureSchema();
  const rows = (await sql()`
    DELETE FROM mcp_images WHERE tag = ${tag} AND user_id = ${userId} RETURNING tag
  `) as { tag: string }[];
  return rows.length > 0;
}
