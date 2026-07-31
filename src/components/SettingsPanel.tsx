"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export function SettingsPanel({ settings, onChange }: Props) {
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
          <p className="text-sm text-ink/60">
            Keys are stored only in this browser&apos;s local storage and sent
            directly to your own API routes on each request. They are never
            written to a database or server-side file.
          </p>

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
              Get one at Google AI Studio (aistudio.google.com/apikey).
            </span>
          </label>

          <label className="block text-sm">
            <span className="kal-label">Gemini image model</span>
            <input
              type="text"
              value={settings.geminiModel}
              onChange={(e) => onChange({ geminiModel: e.target.value })}
              placeholder="gemini-2.5-flash-image"
              className="kal-input"
            />
          </label>

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
        </div>
      )}
    </div>
  );
}
