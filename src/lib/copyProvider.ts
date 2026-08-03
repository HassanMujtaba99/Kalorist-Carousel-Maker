import type { AppSettings, CopyProvider } from "./types";
import { draftCopy as draftWithClaude } from "./claudeClient";
import { draftWithGeminiText } from "./geminiCopyClient";
import { draftWithOpenAI } from "./openaiClient";
import { draftWithCustom } from "./customClient";

export const COPY_PROVIDERS: { id: CopyProvider; label: string }[] = [
  { id: "anthropic", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "custom", label: "Other" },
];

export function copyProviderLabel(provider: CopyProvider): string {
  return COPY_PROVIDERS.find((p) => p.id === provider)?.label ?? provider;
}

/** The API key relevant to whichever provider is currently selected for copy drafting. */
export function activeCopyApiKey(settings: AppSettings): string {
  switch (settings.copyProvider) {
    case "anthropic":
      return settings.anthropicApiKey;
    case "gemini":
      return settings.geminiApiKey;
    case "openai":
      return settings.openaiApiKey;
    case "custom":
      return settings.customApiKey;
  }
}

export interface DraftCopyOptions {
  /** Reference images (data URLs) for providers/models that support vision input. */
  images?: string[];
  maxTokens?: number;
}

/** Drafts copy using whichever provider is selected in Settings. */
export async function draftCopy(
  prompt: string,
  settings: AppSettings,
  options?: DraftCopyOptions
): Promise<string> {
  switch (settings.copyProvider) {
    case "anthropic":
      return draftWithClaude(prompt, settings.anthropicApiKey, settings.anthropicModel, options);
    case "gemini":
      return draftWithGeminiText(prompt, settings.geminiApiKey, settings.geminiCopyModel, options);
    case "openai":
      return draftWithOpenAI(prompt, settings.openaiApiKey, settings.openaiModel, options);
    case "custom":
      return draftWithCustom(
        prompt,
        settings.customApiKey,
        settings.customModel,
        settings.customBaseUrl,
        options
      );
  }
}
