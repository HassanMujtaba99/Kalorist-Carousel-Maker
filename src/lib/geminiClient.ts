export async function generateSlideImage(
  prompt: string,
  apiKey: string,
  model: string,
  /** Reference photos (data URLs) to include as-is in the composed slide, e.g. a user's own photo. */
  images?: string[]
): Promise<string> {
  const res = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey, model, images }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Generation failed (${res.status})`);
  }
  return json.imageDataUrl as string;
}

export interface GeminiImageModel {
  id: string;
  displayName: string;
  description?: string;
}

export async function fetchImageModels(apiKey: string): Promise<GeminiImageModel[]> {
  const res = await fetch("/api/gemini/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Could not fetch models (${res.status})`);
  }
  return (json.models ?? []) as GeminiImageModel[];
}
