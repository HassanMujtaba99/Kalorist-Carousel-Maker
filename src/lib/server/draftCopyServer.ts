import type { AppSettings } from "@/lib/types";

/**
 * Server-context counterpart of src/lib/copyProvider.ts's draftCopy(): the
 * client version does relative fetch("/api/.../generate-copy") calls, which
 * only resolve inside a browser (relative to the current page's origin) —
 * they throw when called from a serverless function with no implicit
 * origin. This calls each upstream provider's API directly instead, so it
 * works from the MCP route (or any other server context) without a
 * self-referential HTTP hop back into this same app.
 *
 * Deliberately NOT wired into the existing /api/*\/generate-copy route
 * handlers — those are already working and tested; duplicating this logic
 * here is a small, isolated cost that avoids any regression risk to them.
 */

interface DraftOptions {
  images?: string[];
  maxTokens?: number;
}

const ANTHROPIC_VERSION = "2023-06-01";

const BLOCKED_HOSTS = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1", "169.254.169.254"]);

/** Same best-effort SSRF guard as /api/custom/generate-copy — this server
 * runs the fetch on shared infrastructure, so an arbitrary caller-supplied
 * base URL is the same risk here as it is there. */
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

function dataUrlParts(dataUrl: string): { mediaType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mediaType: match[1], data: match[2] };
}

async function upstreamErrorMessage(res: Response, label: string): Promise<string> {
  const text = await res.text().catch(() => "");
  let message = text.slice(0, 500);
  try {
    const parsed = JSON.parse(text);
    message = parsed?.error?.message ?? message;
  } catch {
    // keep raw text
  }
  return `${label} API error (${res.status}): ${message}`;
}

async function draftWithClaudeServer(
  prompt: string,
  apiKey: string,
  model: string,
  options?: DraftOptions
): Promise<string> {
  const maxTokens = options?.maxTokens && options.maxTokens > 0 ? options.maxTokens : 300;
  const imageBlocks = (options?.images ?? [])
    .map(dataUrlParts)
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(await upstreamErrorMessage(res, "Anthropic"));

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Claude did not return any text. Try again.");
  return text;
}

async function draftWithGeminiServer(
  prompt: string,
  apiKey: string,
  model: string,
  options?: DraftOptions
): Promise<string> {
  const resolvedModel = model || "gemini-2.5-flash";
  const maxTokens = options?.maxTokens && options.maxTokens > 0 ? options.maxTokens : 300;
  const imageParts = (options?.images ?? [])
    .map(dataUrlParts)
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({ inlineData: { mimeType: p.mediaType, data: p.data } }));

  const isFlashFamily = /flash/i.test(resolvedModel);
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: isFlashFamily ? maxTokens : maxTokens + 2000,
  };
  if (isFlashFamily) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
        generationConfig,
      }),
    }
  );
  if (!res.ok) throw new Error(await upstreamErrorMessage(res, "Gemini"));

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini did not return any text. Try again.");
  if (data.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini's reply was cut off before finishing (hit the token limit) — try again.");
  }
  return text;
}

async function draftWithOpenAiCompatibleServer(
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl: string,
  label: string,
  options?: DraftOptions
): Promise<string> {
  const maxTokens = options?.maxTokens && options.maxTokens > 0 ? options.maxTokens : 300;
  const images = (options?.images ?? []).filter((i) => /^data:[^;]+;base64,/.test(i));
  const content = [
    { type: "text", text: prompt },
    ...images.map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: images.length > 0 ? content : prompt }],
    }),
  });
  if (!res.ok) throw new Error(await upstreamErrorMessage(res, label));

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${label} did not return any text. Try again.`);
  return text;
}

export async function draftCopyServer(
  prompt: string,
  settings: AppSettings,
  options?: DraftOptions
): Promise<string> {
  switch (settings.copyProvider) {
    case "anthropic":
      if (!settings.anthropicApiKey.trim()) throw new Error("Missing Anthropic API key.");
      return draftWithClaudeServer(prompt, settings.anthropicApiKey, settings.anthropicModel, options);
    case "gemini":
      if (!settings.geminiApiKey.trim()) throw new Error("Missing Gemini API key.");
      return draftWithGeminiServer(prompt, settings.geminiApiKey, settings.geminiCopyModel, options);
    case "openai":
      if (!settings.openaiApiKey.trim()) throw new Error("Missing OpenAI API key.");
      return draftWithOpenAiCompatibleServer(
        prompt,
        settings.openaiApiKey,
        settings.openaiModel || "gpt-4o-mini",
        "https://api.openai.com/v1",
        "OpenAI",
        options
      );
    case "custom": {
      const baseUrl = settings.customBaseUrl.trim().replace(/\/+$/, "");
      if (!baseUrl) throw new Error("Missing custom provider base URL.");
      if (!isSafeCustomBaseUrl(baseUrl)) throw new Error("Base URL must be a public https:// address.");
      if (!settings.customApiKey.trim()) throw new Error("Missing custom provider API key.");
      if (!settings.customModel.trim()) throw new Error("Missing custom provider model.");
      return draftWithOpenAiCompatibleServer(
        prompt,
        settings.customApiKey,
        settings.customModel,
        baseUrl,
        "Custom provider",
        options
      );
    }
  }
}
