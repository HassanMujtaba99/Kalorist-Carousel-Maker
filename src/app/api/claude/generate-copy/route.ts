import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  content?: AnthropicContentBlock[];
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
      { error: "Missing Anthropic API key. Add it in Settings first." },
      { status: 400 }
    );
  }
  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt'." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the Anthropic API." },
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
      { error: `Anthropic API error (${upstream.status}): ${message}` },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  const data = (await upstream.json()) as AnthropicMessageResponse;
  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    return NextResponse.json(
      { error: "Claude did not return any text. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ text });
}
