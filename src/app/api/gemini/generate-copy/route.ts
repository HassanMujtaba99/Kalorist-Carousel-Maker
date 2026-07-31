import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-2.5-flash";

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; apiKey?: string; model?: string };
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
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300 },
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

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return NextResponse.json(
      { error: "Gemini did not return any text. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ text });
}
