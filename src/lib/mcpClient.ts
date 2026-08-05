export interface McpTokenSummary {
  id: string;
  label: string;
  createdAt: number;
  lastUsedAt: number | null;
}

export interface McpImageSummary {
  tag: string;
  createdAt: number;
}

async function parseJsonOrThrow(res: Response): Promise<Record<string, unknown>> {
  const json = await res.json();
  if (!res.ok) {
    throw new Error((json.error as string) || `Request failed (${res.status})`);
  }
  return json;
}

export async function listMcpTokens(): Promise<McpTokenSummary[]> {
  const res = await fetch("/api/mcp-tokens");
  const json = await parseJsonOrThrow(res);
  return (json.tokens ?? []) as McpTokenSummary[];
}

export async function createMcpToken(label: string): Promise<{ id: string; token: string; label: string }> {
  const res = await fetch("/api/mcp-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  const json = await parseJsonOrThrow(res);
  return json as unknown as { id: string; token: string; label: string };
}

export async function revokeMcpToken(id: string): Promise<void> {
  const res = await fetch(`/api/mcp-tokens/${id}`, { method: "DELETE" });
  await parseJsonOrThrow(res);
}

export async function listMcpImages(): Promise<McpImageSummary[]> {
  const res = await fetch("/api/mcp-images");
  const json = await parseJsonOrThrow(res);
  return (json.images ?? []) as McpImageSummary[];
}

export async function uploadMcpImage(dataUrl: string): Promise<string> {
  const res = await fetch("/api/mcp-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const json = await parseJsonOrThrow(res);
  return json.tag as string;
}

export async function deleteMcpImage(tag: string): Promise<void> {
  const res = await fetch(`/api/mcp-images/${tag}`, { method: "DELETE" });
  await parseJsonOrThrow(res);
}
