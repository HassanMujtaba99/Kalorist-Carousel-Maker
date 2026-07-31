import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "gpt-4o-mini";

interface OpenAIChoice {
  message?: { content?: string };
}

interface OpenAIChatResponse {
  choices?: OpenAIChoice[];
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
      { error: "Missing OpenAI API key. Add it in Settings first." },
      { status: 400 }
    );
  }
  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt'." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
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

  const data = (await upstream.json()) as OpenAIChatResponse;
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "OpenAI did not return any text. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ text });
}
