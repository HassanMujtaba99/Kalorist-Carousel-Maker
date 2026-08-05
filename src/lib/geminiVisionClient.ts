export interface DetectedBox {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Runs Gemini's object-detection mode on one image, returning best-effort
 * bounding boxes for distinct visual items. Boxes can be off-position or
 * wrong-sized — this is a starting point for the user to correct, not a
 * final answer. */
export async function detectImageItems(
  image: string,
  apiKey: string,
  model: string
): Promise<DetectedBox[]> {
  const res = await fetch("/api/gemini/detect-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, apiKey, model }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `Item detection failed (${res.status})`);
  }
  return (json.items ?? []) as DetectedBox[];
}
