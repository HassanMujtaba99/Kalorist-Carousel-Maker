import { NextRequest, NextResponse } from "next/server";

interface GeminiModel {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

interface GeminiModelsResponse {
  models?: GeminiModel[];
}

function looksImageCapable(model: GeminiModel): boolean {
  const name = model.name.toLowerCase();
  const supportsGenerate = (model.supportedGenerationMethods ?? []).includes(
    "generateContent"
  );
  return supportsGenerate && (name.includes("image") || name.includes("imagen"));
}

function looksTextCapable(model: GeminiModel): boolean {
  const name = model.name.toLowerCase();
  const supportsGenerate = (model.supportedGenerationMethods ?? []).includes(
    "generateContent"
  );
  return supportsGenerate && !name.includes("image") && !name.includes("imagen");
}

export async function POST(req: NextRequest) {
  let body: { apiKey?: string; purpose?: "image" | "text" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  const purpose = body.purpose === "text" ? "text" : "image";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing Gemini API key. Add it above first." },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
      {
        method: "GET",
        headers: { "x-goog-api-key": apiKey },
      }
    );
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

  const data = (await upstream.json()) as GeminiModelsResponse;
  const models = (data.models ?? [])
    .filter(purpose === "text" ? looksTextCapable : looksImageCapable)
    .map((m) => ({
      id: m.name.replace(/^models\//, ""),
      displayName: m.displayName || m.name.replace(/^models\//, ""),
      description: m.description,
    }));

  return NextResponse.json({ models });
}
