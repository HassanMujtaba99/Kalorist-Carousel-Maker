import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicModel {
  id: string;
  display_name?: string;
}

interface AnthropicModelsResponse {
  data?: AnthropicModel[];
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
      { error: "Missing Anthropic API key. Add it above first." },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
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

  const data = (await upstream.json()) as AnthropicModelsResponse;
  const models = (data.data ?? []).map((m) => ({
    id: m.id,
    displayName: m.display_name || m.id,
  }));

  return NextResponse.json({ models });
}
