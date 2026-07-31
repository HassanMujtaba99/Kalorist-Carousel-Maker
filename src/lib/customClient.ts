export async function draftWithCustom(
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl: string
): Promise<string> {
  const res = await fetch("/api/custom/generate-copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, apiKey, model, baseUrl }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Draft failed (${res.status})`);
  }
  return json.text as string;
}
