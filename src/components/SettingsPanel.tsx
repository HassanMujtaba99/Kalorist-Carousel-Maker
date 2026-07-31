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
    <div className="rounded-xl border border-black/10 bg-white dark:bg-neutral-900 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-medium">
          API Keys
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              hasGeminiKey ? "bg-green-500" : "bg-amber-500"
            }`}
            title={hasGeminiKey ? "Gemini key set" : "Gemini key required"}
          />
        </span>
        <span className="text-sm text-black/50 dark:text-white/50">
          {open ? "Hide" : hasGeminiKey ? "Edit" : "Set up"}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-black/10 px-4 py-4 dark:border-white/10">
          <p className="text-sm text-black/60 dark:text-white/60">
            Keys are stored only in this browser&apos;s local storage and sent
            directly to your own API routes on each request. They are never
            written to a database or server-side file.
          </p>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              Gemini API key <span className="text-red-500">*</span>
            </span>
            <input
              type="password"
              value={settings.geminiApiKey}
              onChange={(e) => onChange({ geminiApiKey: e.target.value })}
              placeholder="AIza..."
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
            />
            <span className="mt-1 block text-xs text-black/45 dark:text-white/45">
              Get one at Google AI Studio (aistudio.google.com/apikey).
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Gemini image model</span>
            <input
              type="text"
              value={settings.geminiModel}
              onChange={(e) => onChange({ geminiModel: e.target.value })}
              placeholder="gemini-2.5-flash-image"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              USDA FoodData Central API key
            </span>
            <input
              type="password"
              value={settings.usdaApiKey}
              onChange={(e) => onChange({ usdaApiKey: e.target.value })}
              placeholder="Optional — DEMO_KEY is used otherwise"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
            />
            <span className="mt-1 block text-xs text-black/45 dark:text-white/45">
              Optional. Get a free key at api.data.gov/signup — DEMO_KEY works
              but is rate-limited.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
