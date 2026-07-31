"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";
import { fetchImageModels, type GeminiImageModel } from "@/lib/geminiClient";

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<GeminiImageModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const hasGeminiKey = settings.geminiApiKey.trim().length > 0;

  const loadModels = async () => {
    if (!hasGeminiKey) {
      setModelsError("Add your Gemini API key above first.");
      return;
    }
    setModelsLoading(true);
    setModelsError(null);
    try {
      const fetched = await fetchImageModels(settings.geminiApiKey);
      setModels(fetched);
      if (fetched.length === 0) {
        setModelsError("No image-capable models found for this key.");
      }
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Could not fetch models");
    } finally {
      setModelsLoading(false);
    }
  };

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

          <div className="block text-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="kal-label !mb-0">Gemini image model</span>
              <button
                type="button"
                onClick={loadModels}
                disabled={modelsLoading}
                className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
              >
                {modelsLoading ? "Fetching…" : "Fetch available models"}
              </button>
            </div>
            <input
              type="text"
              value={settings.geminiModel}
              onChange={(e) => onChange({ geminiModel: e.target.value })}
              placeholder="gemini-2.5-flash-image"
              className="kal-input"
            />
            {modelsError && (
              <p className="mt-1.5 text-xs font-semibold text-purple">{modelsError}</p>
            )}
            {models.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {models.map((model) => {
                  const selected = model.id === settings.geminiModel;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      title={model.description}
                      onClick={() => onChange({ geminiModel: model.id })}
                      className={
                        selected
                          ? "kal-pill"
                          : "rounded-full border-2 border-ink/15 px-3 py-1 text-xs font-bold text-ink/70 hover:border-ink hover:bg-lime/30"
                      }
                    >
                      {selected && "✓ "}
                      {model.displayName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
