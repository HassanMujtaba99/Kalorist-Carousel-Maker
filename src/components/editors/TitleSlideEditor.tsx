"use client";

import { useState } from "react";
import type { AppSettings, TitleSlideData } from "@/lib/types";
import { draftCopy, activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { buildHeadlinePrompt } from "@/lib/copyAssist";
import { ImageUpload } from "../ImageUpload";

interface Props {
  data: TitleSlideData;
  settings: AppSettings;
  onChange: (data: TitleSlideData) => void;
}

export function TitleSlideEditor({ data, settings, onChange }: Props) {
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const draftHeadline = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const headline = await draftCopy(buildHeadlinePrompt(data.headline), settings);
      onChange({ ...data, headline });
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
          <span className="kal-label !mb-0">Headline</span>
          <button
            type="button"
            onClick={draftHeadline}
            disabled={drafting}
            className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
          >
            {drafting ? "Drafting…" : `Draft with ${providerLabel}`}
          </button>
        </div>
        <textarea
          value={data.headline}
          onChange={(e) => onChange({ ...data, headline: e.target.value })}
          rows={2}
          className="kal-input"
        />
        {error && <p className="mt-1 text-xs font-semibold text-purple">{error}</p>}
      </label>
      <label className="block text-sm">
        <span className="kal-label">Subheadline (optional)</span>
        <input
          type="text"
          value={data.subheadline ?? ""}
          onChange={(e) => onChange({ ...data, subheadline: e.target.value })}
          className="kal-input"
        />
      </label>
      <ImageUpload
        label="Background photo (optional — uses your own photo as-is instead of an AI-imagined scene)"
        photo={data.photo ?? null}
        onChange={(photo) => onChange({ ...data, photo })}
      />
      <label className="block text-sm">
        <span className="kal-label">
          Background scene{data.photo ? " (ignored while a photo is attached above)" : ""}
        </span>
        <textarea
          value={data.scenePrompt}
          onChange={(e) => onChange({ ...data, scenePrompt: e.target.value })}
          rows={2}
          placeholder="e.g. a smiling person in gym clothes standing in a bright kitchen"
          disabled={!!data.photo}
          className="kal-input disabled:opacity-40"
        />
      </label>
    </div>
  );
}
