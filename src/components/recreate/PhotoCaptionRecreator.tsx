"use client";

import { useState } from "react";
import type { AppSettings, CarouselBrand } from "@/lib/types";
import { ImageUpload } from "../ImageUpload";
import { generateSlideImage } from "@/lib/geminiClient";
import { draftCopy, activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { buildHeadlinePrompt } from "@/lib/copyAssist";
import { buildPhotoCaptionRecreatePrompt } from "@/lib/recreatePromptBuilder";
import { ResultPreview } from "./ResultPreview";

interface Props {
  settings: AppSettings;
  brand: CarouselBrand;
}

export function PhotoCaptionRecreator({ settings, brand }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("Save this post for reference 🙏");
  const [drafting, setDrafting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const draftCaption = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      setCaption(await draftCopy(buildHeadlinePrompt(topic), settings));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  };

  const generate = async () => {
    if (!settings.geminiApiKey.trim()) {
      setError("Add your Gemini API key in Settings first.");
      return;
    }
    setGenerating(true);
    setError(null);
    setResultUrl(null);
    try {
      const prompt = buildPhotoCaptionRecreatePrompt(caption, brand, !!photo);
      const url = await generateSlideImage(
        prompt,
        settings.geminiApiKey,
        settings.geminiModel,
        photo ? [photo] : undefined
      );
      setResultUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <ImageUpload label="Your photo (optional — AI generates one if skipped)" photo={photo} onChange={setPhoto} />
        <label className="block text-sm">
          <span className="kal-label">Rough topic (optional)</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 5 fast food swaps"
            className="kal-input"
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="kal-label !mb-0">Caption</span>
            <button
              type="button"
              onClick={draftCaption}
              disabled={drafting}
              className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
            >
              {drafting ? "Drafting…" : `Draft with ${providerLabel}`}
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="kal-input"
          />
        </label>
        <button type="button" onClick={generate} disabled={generating} className="kal-btn-primary">
          {generating ? "Generating…" : "Generate slide"}
        </button>
        {error && <p className="text-xs font-semibold text-purple">{error}</p>}
      </div>
      <ResultPreview url={resultUrl} generating={generating} filename="recreated-slide.png" />
    </div>
  );
}
