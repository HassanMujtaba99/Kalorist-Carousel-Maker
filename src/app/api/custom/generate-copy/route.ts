import { NextRequest, NextResponse } from "next/server";

interface OpenAIChoice {
  message?: { content?: string };
}

interface OpenAIChatResponse {
  choices?: OpenAIChoice[];
}

const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1", "169.254.169.254"]);

/**
 * Best-effort SSRF guard for the user-supplied "other" base URL: this app is
 * multi-tenant (any signed-in user can set this), so without a check a
 * malicious value could make our server fetch internal/private network
 * addresses. This blocks the obvious cases (loopback, link-local, private
 * ranges, cloud metadata) by hostname/IP literal — it does not resolve DNS,
 * so it's not a complete guarantee against a hostname that resolves to a
 * private IP, only a reasonable baseline.
 */
function isSafeCustomBaseUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return false;
  if (/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^169\.254\./.test(host)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; apiKey?: string; model?: string; baseUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const prompt = body.prompt?.trim();
  const model = body.model?.trim();
  const baseUrl = body.baseUrl?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    return NextResponse.json(
      { error: "Missing base URL. Add it in Settings first (e.g. https://api.groq.com/openai/v1)." },
      { status: 400 }
    );
  }
  if (!isSafeCustomBaseUrl(baseUrl)) {
    return NextResponse.json(
      { error: "Base URL must be a public https:// address." },
      { status: 400 }
    );
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key for your custom provider. Add it in Settings first." },
      { status: 400 }
    );
  }
  if (!model) {
    return NextResponse.json(
      { error: "Missing model name for your custom provider. Add it in Settings first." },
      { status: 400 }
    );
  }
  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt'." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach your custom provider's API." },
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
      { error: `Provider API error (${upstream.status}): ${message}` },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  const data = (await upstream.json()) as OpenAIChatResponse;
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    return NextResponse.json(
      { error: "Your custom provider did not return any text. Try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ text });
}
