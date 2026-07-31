export async function generateSlideImage(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const res = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey, model }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Generation failed (${res.status})`);
  }
  return json.imageDataUrl as string;
}
