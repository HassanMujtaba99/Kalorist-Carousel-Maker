export interface ClaudeModel {
  id: string;
  displayName: string;
}

export async function fetchClaudeModels(apiKey: string): Promise<ClaudeModel[]> {
  const res = await fetch("/api/claude/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Could not fetch models (${res.status})`);
  }
  return (json.models ?? []) as ClaudeModel[];
}

export async function draftCopy(
  prompt: string,
  apiKey: string,
  model: string,
  options?: { images?: string[]; maxTokens?: number }
): Promise<string> {
  const res = await fetch("/api/claude/generate-copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      apiKey,
      model,
      images: options?.images,
      maxTokens: options?.maxTokens,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Draft failed (${res.status})`);
  }
  return json.text as string;
}
