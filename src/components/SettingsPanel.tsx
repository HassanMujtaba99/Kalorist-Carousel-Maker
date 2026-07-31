"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";
import { fetchImageModels } from "@/lib/geminiClient";
import { fetchClaudeModels } from "@/lib/claudeClient";
import { fetchGeminiTextModels } from "@/lib/geminiCopyClient";
import { fetchOpenAIModels } from "@/lib/openaiClient";
import { COPY_PROVIDERS } from "@/lib/copyProvider";
import { ModelPickerField } from "./ModelPickerField";

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  signedIn: boolean;
  syncStatus: "idle" | "syncing" | "synced" | "error";
}

const SYNC_STATUS_LABEL: Record<Props["syncStatus"], string> = {
  idle: "",
  syncing: "Saving to your account…",
  synced: "Saved to your account",
  error: "Couldn't sync to your account — retrying on next change",
};

export function SettingsPanel({ settings, onChange, signedIn, syncStatus }: Props) {
  const [open, setOpen] = useState(false);
  const hasGeminiKey = settings.geminiApiKey.trim().length > 0;

  return (
    <div className="kal-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-bold text-ink">
          API Keys
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              hasGeminiKey ? "bg-lime-dark" : "bg-purple"
            }`}
            title={hasGeminiKey ? "Gemini key set" : "Gemini key required"}
          />
        </span>
        <span className="text-sm font-semibold text-purple">
          {open ? "Hide" : hasGeminiKey ? "Edit" : "Set up"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t-2 border-ink px-4 py-4">
          {signedIn ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-ink/60">
                Keys sync automatically to your account (encrypted at rest)
                as you type, so they follow you across devices. Nothing else
                needs to be clicked — this just confirms it&apos;s working.
              </p>
              {syncStatus !== "idle" && (
                <span
                  className={`kal-pill shrink-0 whitespace-nowrap !bg-transparent !text-xs ${
                    syncStatus === "error"
                      ? "!border-red-600 !text-red-600"
                      : syncStatus === "syncing"
                        ? "!border-ink/30 !text-ink/50"
                        : "!border-lime-dark !text-ink"
                  }`}
                >
                  {SYNC_STATUS_LABEL[syncStatus]}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink/60">
              Keys are stored only in this browser&apos;s local storage and
              sent directly to your own API routes on each request. Sign in
              (see the Account panel above) to sync them to your account
              instead.
            </p>
          )}

          <label className="block text-sm">
            <span className="kal-label">
              Gemini API key <span className="text-purple">*</span>
            </span>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => onChange({ geminiApiKey: e.target.value })}
              placeholder="AIza..."
              className="kal-input"
            />
            <span className="mt-1 block text-xs text-ink/45">
              Get one at Google AI Studio (aistudio.google.com/apikey). Used to
              generate the slide images.
            </span>
          </label>

          <ModelPickerField
            label="Gemini image model"
            apiKey={settings.geminiApiKey}
            model={settings.geminiModel}
            modelPlaceholder="gemini-2.5-flash-image"
            fetchModels={fetchImageModels}
            onModelChange={(geminiModel) => onChange({ geminiModel })}
            noKeyMessage="Add your Gemini API key above first."
          />

          <label className="block text-sm">
            <span className="kal-label">USDA FoodData Central API key</span>
            <input
              type="password"
              value={settings.usdaApiKey}
              onChange={(e) => onChange({ usdaApiKey: e.target.value })}
              placeholder="Optional — DEMO_KEY is used otherwise"
              className="kal-input"
            />
            <span className="mt-1 block text-xs text-ink/45">
              Optional. Get a free key at api.data.gov/signup — DEMO_KEY works
              but is rate-limited.
            </span>
          </label>

          <div className="border-t-2 border-dashed border-ink/15 pt-4">
            <span className="kal-label">Copywriting / brainstorming model</span>
            <p className="mb-2 text-xs text-ink/45">
              Powers the &quot;Draft with…&quot; buttons that write headlines,
              labels, and CTAs on slides. Optional — pick whichever provider
              you already have a key for. Image generation always uses
              Gemini above, regardless of this choice.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {COPY_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ copyProvider: p.id })}
                  className={settings.copyProvider === p.id ? "kal-pill" : "kal-btn-ghost"}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {settings.copyProvider === "anthropic" && (
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="kal-label">Anthropic (Claude) API key</span>
                  <input
                    type="password"
                    value={settings.anthropicApiKey}
                    onChange={(e) => onChange({ anthropicApiKey: e.target.value })}
                    placeholder="sk-ant-..."
                    className="kal-input"
                  />
                  <span className="mt-1 block text-xs text-ink/45">
                    Get one at console.anthropic.com/settings/keys. Pay-per-token
                    API access, separate from a Claude.ai subscription.
                  </span>
                </label>
                <ModelPickerField
                  label="Claude model"
                  apiKey={settings.anthropicApiKey}
                  model={settings.anthropicModel}
                  modelPlaceholder="claude-sonnet-5"
                  fetchModels={fetchClaudeModels}
                  onModelChange={(anthropicModel) => onChange({ anthropicModel })}
                  noKeyMessage="Add your Anthropic API key above first."
                />
              </div>
            )}

            {settings.copyProvider === "gemini" && (
              <div className="space-y-4">
                <p className="text-xs text-ink/45">
                  Uses the same Gemini API key entered above — no separate key
                  needed.
                </p>
                <ModelPickerField
                  label="Gemini text model"
                  apiKey={settings.geminiApiKey}
                  model={settings.geminiCopyModel}
                  modelPlaceholder="gemini-2.5-flash"
                  fetchModels={fetchGeminiTextModels}
                  onModelChange={(geminiCopyModel) => onChange({ geminiCopyModel })}
                  noKeyMessage="Add your Gemini API key above first."
                />
              </div>
            )}

            {settings.copyProvider === "openai" && (
              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="kal-label">OpenAI API key</span>
                  <input
                    type="password"
                    value={settings.openaiApiKey}
                    onChange={(e) => onChange({ openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="kal-input"
                  />
                  <span className="mt-1 block text-xs text-ink/45">
                    Get one at platform.openai.com/api-keys.
                  </span>
                </label>
                <ModelPickerField
                  label="OpenAI model"
                  apiKey={settings.openaiApiKey}
                  model={settings.openaiModel}
                  modelPlaceholder="gpt-4o-mini"
                  fetchModels={fetchOpenAIModels}
                  onModelChange={(openaiModel) => onChange({ openaiModel })}
                  noKeyMessage="Add your OpenAI API key above first."
                />
              </div>
            )}

            {settings.copyProvider === "custom" && (
              <div className="space-y-4">
                <p className="text-xs text-ink/45">
                  Any OpenAI-compatible chat completions API — Groq, Mistral,
                  Together, a local Ollama server, etc.
                </p>
                <label className="block text-sm">
                  <span className="kal-label">Base URL</span>
                  <input
                    type="text"
                    value={settings.customBaseUrl}
                    onChange={(e) => onChange({ customBaseUrl: e.target.value })}
                    placeholder="https://api.groq.com/openai/v1"
                    className="kal-input"
                  />
                  <span className="mt-1 block text-xs text-ink/45">
                    Must be a public https:// address ending before
                    &quot;/chat/completions&quot; (that part is added
                    automatically).
                  </span>
                </label>
                <label className="block text-sm">
                  <span className="kal-label">API key</span>
                  <input
                    type="password"
                    value={settings.customApiKey}
                    onChange={(e) => onChange({ customApiKey: e.target.value })}
                    className="kal-input"
                  />
                </label>
                <label className="block text-sm">
                  <span className="kal-label">Model</span>
                  <input
                    type="text"
                    value={settings.customModel}
                    onChange={(e) => onChange({ customModel: e.target.value })}
                    placeholder="e.g. llama-3.3-70b-versatile"
                    className="kal-input"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
