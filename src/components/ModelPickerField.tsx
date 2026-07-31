"use client";

import { useState } from "react";

interface ModelOption {
  id: string;
  displayName: string;
  description?: string;
}

interface Props {
  label: string;
  apiKey: string;
  model: string;
  modelPlaceholder: string;
  fetchModels: (apiKey: string) => Promise<ModelOption[]>;
  onModelChange: (model: string) => void;
  noKeyMessage: string;
}

/** Shared "fetch available models and pick one" control used for both Gemini and Claude. */
export function ModelPickerField({
  label,
  apiKey,
  model,
  modelPlaceholder,
  fetchModels,
  onModelChange,
  noKeyMessage,
}: Props) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasKey = apiKey.trim().length > 0;

  const load = async () => {
    if (!hasKey) {
      setError(noKeyMessage);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchModels(apiKey);
      setModels(fetched);
      if (fetched.length === 0) {
        setError("No models found for this key.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch models");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="block text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="kal-label !mb-0">{label}</span>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
        >
          {loading ? "Fetching…" : "Fetch available models"}
        </button>
      </div>
      <input
        type="text"
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        placeholder={modelPlaceholder}
        className="kal-input"
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-purple">{error}</p>}
      {models.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {models.map((m) => {
            const selected = m.id === model;
            return (
              <button
                key={m.id}
                type="button"
                title={m.description}
                onClick={() => onModelChange(m.id)}
                className={
                  selected
                    ? "kal-pill"
                    : "rounded-full border-2 border-ink/15 px-3 py-1 text-xs font-bold text-ink/70 hover:border-ink hover:bg-lime/30"
                }
              >
                {selected && "✓ "}
                {m.displayName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
