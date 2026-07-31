import { NextRequest, NextResponse } from "next/server";

interface OpenAIModel {
  id: string;
}

interface OpenAIModelsResponse {
  data?: OpenAIModel[];
}

/** OpenAI's /v1/models lists every model on the account, including
 * embeddings/whisper/tts/image/moderation models that can't do chat
 * completions — filter down to the chat-capable families. */
function looksChatCapable(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes("embedding") ||
    lower.includes("whisper") ||
    lower.includes("tts") ||
    lower.includes("dall-e") ||
    lower.includes("moderation") ||
    lower.includes("davinci") ||
    lower.includes("babbage") ||
    lower.includes("audio")
  ) {
    return false;
  }
  return lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4") || lower.startsWith("chatgpt-");
}

export async function POST(req: NextRequest) {
  let body: { apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenAI API key. Add it above first." },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the OpenAI API." },
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
      { error: `OpenAI API error (${upstream.status}): ${message}` },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  const data = (await upstream.json()) as OpenAIModelsResponse;
  const models = (data.data ?? [])
    .filter((m) => looksChatCapable(m.id))
    .map((m) => ({ id: m.id, displayName: m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return NextResponse.json({ models });
}
