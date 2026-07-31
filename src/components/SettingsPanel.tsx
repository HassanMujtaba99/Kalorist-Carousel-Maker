"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";
import { fetchImageModels } from "@/lib/geminiClient";
import { fetchClaudeModels } from "@/lib/claudeClient";
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
                Optional. Get one at console.anthropic.com/settings/keys — powers
                the &quot;Draft with Claude&quot; copywriting button on slides.
                Pay-per-token API access, separate from a Claude.ai subscription.
              </span>
            </label>

            <div className="mt-4">
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
          </div>
        </div>
      )}
    </div>
  );
}
