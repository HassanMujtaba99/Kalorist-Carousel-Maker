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

function dataUrlToInlinePart(dataUrl: string): { inlineData: { mimeType: string; data: string } } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

const DETECTION_PROMPT = `Identify the distinct visually-notable items in this image: individual food
items, dishes, and drinks, plus any distinct on-image text elements, badges,
or labels. For each one, give a short name (2-4 words) and its bounding box.

Reply with ONLY a JSON array, nothing else — no markdown, no code fences, no
preamble. Each entry: {"label": "<short name>", "box_2d": [ymin, xmin, ymax, xmax]}
with coordinates normalized to a 0-1000 scale (0,0 is the top-left corner,
1000,1000 is the bottom-right corner). Include at most 12 items — only the
clearly distinct ones, not overlapping duplicates.`;

export async function POST(req: NextRequest) {
  let body: { apiKey?: string; model?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim() || DEFAULT_MODEL;
  const image = body.image?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Gemini API key. Add it in Settings first." },
      { status: 400 }
    );
  }
  if (!image) {
    return NextResponse.json({ error: "Missing 'image'." }, { status: 400 });
  }

  const imagePart = dataUrlToInlinePart(image);
  if (!imagePart) {
    return NextResponse.json({ error: "Invalid image data." }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  // Same "flash models think by default and maxOutputTokens covers hidden
  // reasoning + the visible answer combined" issue as generate-copy — this
  // route's whole job is a short structured JSON reply, so thinking is
  // disabled outright for flash/flash-lite rather than budgeted around.
  const isFlashFamily = /flash/i.test(model);
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    maxOutputTokens: isFlashFamily ? 1500 : 3500,
  };
  if (isFlashFamily) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [imagePart, { text: DETECTION_PROMPT }] }],
        generationConfig,
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

  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim());
  } catch {
    return NextResponse.json(
      { error: "Could not parse Gemini's item detection response. Try again." },
      { status: 502 }
    );
  }

  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "Gemini's response wasn't in the expected format. Try again." },
      { status: 502 }
    );
  }

  const items = raw
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;
      const e = entry as Record<string, unknown>;
      const label = typeof e.label === "string" ? e.label.trim() : "";
      const box = Array.isArray(e.box_2d) ? e.box_2d : null;
      if (!label || !box || box.length !== 4 || box.some((n) => typeof n !== "number")) {
        return null;
      }
      const [ymin, xmin, ymax, xmax] = box as number[];
      if (xmax <= xmin || ymax <= ymin) return null;
      return {
        label,
        x: Math.max(0, Math.min(100, xmin / 10)),
        y: Math.max(0, Math.min(100, ymin / 10)),
        width: Math.max(1, Math.min(100 - xmin / 10, (xmax - xmin) / 10)),
        height: Math.max(1, Math.min(100 - ymin / 10, (ymax - ymin) / 10)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return NextResponse.json({ items });
}
