"use client";

import { useState } from "react";
import type { AppSettings, CtaSlideData } from "@/lib/types";
import { draftCopy, activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { buildCtaPrompt } from "@/lib/copyAssist";

interface Props {
  data: CtaSlideData;
  settings: AppSettings;
  onChange: (data: CtaSlideData) => void;
}

export function CtaSlideEditor({ data, settings, onChange }: Props) {
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const draftMessage = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const message = await draftCopy(buildCtaPrompt(data.message), settings);
      onChange({ ...data, message });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="kal-label !mb-0">CTA message</span>
          <button
            type="button"
            onClick={draftMessage}
            disabled={drafting}
            className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
          >
            {drafting ? "Drafting…" : `Draft with ${providerLabel}`}
          </button>
        </div>
        <input
          type="text"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="kal-input"
        />
        {error && <p className="mt-1 text-xs font-semibold text-purple">{error}</p>}
      </label>
      <label className="block text-sm">
        <span className="kal-label">Background scene</span>
        <textarea
          value={data.scenePrompt}
          onChange={(e) => onChange({ ...data, scenePrompt: e.target.value })}
          rows={2}
          className="kal-input"
        />
      </label>
    </div>
  );
}
