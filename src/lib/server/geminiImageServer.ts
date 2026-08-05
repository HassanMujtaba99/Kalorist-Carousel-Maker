/** Server-context counterpart of src/lib/geminiClient.ts — same direct-to-
 * Gemini logic as /api/gemini/generate, duplicated (not shared) to avoid any
 * regression risk to that already-working route. See draftCopyServer.ts for
 * why. Returns a data: URL, same shape the rest of the app already uses. */
export async function generateSlideImageServer(
  prompt: string,
  apiKey: string,
  model: string,
  images?: string[]
): Promise<string> {
  const imageParts = (images ?? [])
    .map((dataUrl) => {
      const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model || "gemini-2.5-flash-image"
    )}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "4:5" },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.slice(0, 500);
    try {
      message = JSON.parse(text)?.error?.message ?? message;
    } catch {
      // keep raw text
    }
    throw new Error(`Gemini API error (${res.status}): ${message}`);
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] };
    }[];
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((p) => p.text)?.text;
    throw new Error(textPart || "Gemini did not return an image. Try adjusting the prompt.");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}
