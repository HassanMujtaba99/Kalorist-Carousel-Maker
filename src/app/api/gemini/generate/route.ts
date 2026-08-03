import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-2.5-flash-image";

interface GeminiInlineData {
  mimeType?: string;
  data?: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

/** Turns a "data:image/png;base64,...." data URL into a Gemini inlineData part. */
function dataUrlToInlinePart(dataUrl: string): { inlineData: { mimeType: string; data: string } } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; apiKey?: string; model?: string; images?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const prompt = body.prompt?.trim();
  const model = body.model?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Gemini API key. Add it in Settings first." },
      { status: 400 }
    );
  }
  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt'." }, { status: 400 });
  }

  const imageParts = (body.images ?? [])
    .map(dataUrlToInlinePart)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "4:5" },
        },
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the Gemini API." },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    let message = text.slice(0, 500);
    try {
      const parsed = JSON.parse(text);
      message = parsed?.error?.message ?? message;
    } catch {
      // keep raw text
    }
    return NextResponse.json(
      { error: `Gemini API error (${upstream.status}): ${message}` },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  const data = (await upstream.json()) as GeminiResponse;

  if (data.promptFeedback?.blockReason) {
    return NextResponse.json(
      { error: `Prompt blocked: ${data.promptFeedback.blockReason}` },
      { status: 422 }
    );
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((p) => p.text)?.text;
    return NextResponse.json(
      {
        error:
          textPart ||
          "Gemini did not return an image. Try adjusting the slide content and regenerate.",
      },
      { status: 502 }
    );
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  const dataUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;

  return NextResponse.json({ imageDataUrl: dataUrl });
}
