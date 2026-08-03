export interface GeminiModel {
  id: string;
  displayName: string;
  description?: string;
}

export async function fetchGeminiTextModels(apiKey: string): Promise<GeminiModel[]> {
  const res = await fetch("/api/gemini/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, purpose: "text" }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Could not fetch models (${res.status})`);
  }
  return (json.models ?? []) as GeminiModel[];
}

export async function draftWithGeminiText(
  prompt: string,
  apiKey: string,
  model: string,
  options?: { images?: string[]; maxTokens?: number }
): Promise<string> {
  const res = await fetch("/api/gemini/generate-copy", {
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
