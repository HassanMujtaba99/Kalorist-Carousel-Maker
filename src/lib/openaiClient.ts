export interface OpenAIModel {
  id: string;
  displayName: string;
}

export async function fetchOpenAIModels(apiKey: string): Promise<OpenAIModel[]> {
  const res = await fetch("/api/openai/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Could not fetch models (${res.status})`);
  }
  return (json.models ?? []) as OpenAIModel[];
}

export async function draftWithOpenAI(
  prompt: string,
  apiKey: string,
  model: string,
  options?: { images?: string[]; maxTokens?: number }
): Promise<string> {
  const res = await fetch("/api/openai/generate-copy", {
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
