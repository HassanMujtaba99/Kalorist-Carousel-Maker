"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/types";
import { brainstormCarousel, type BrainstormedCarousel } from "@/lib/carouselBrainstorm";
import { activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { ReferenceImagesUpload } from "./ReferenceImagesUpload";

interface Props {
  settings: AppSettings;
  onGenerated: (result: BrainstormedCarousel) => void;
}

export function BrainstormPanel({ settings, onGenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const run = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const result = await brainstormCarousel(topic, images, count, settings);
      if (result.unresolvedComparisons.length > 0) {
        setWarning(
          `Couldn't find USDA data for: ${result.unresolvedComparisons.join(", ")} — those slides were still added, just review/replace the food picks before generating.`
        );
      }
      onGenerated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brainstorm failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="kal-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-bold text-ink">Brainstorm entire carousel</span>
        <span className="text-sm font-semibold text-purple">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t-2 border-ink px-4 py-4">
          <p className="text-sm text-ink/60">
            {`Type a topic, attach reference images from an earlier post, or both. If you attach images, ${providerLabel} treats them as "Part 1" of the series and brainstorms the next installment — same theme, same format (this-or-that or day-on-a-plate, whichever they show) — without repeating what's already in them. Every calorie number is still a real, live USDA FoodData Central lookup, never invented by the model.`}
          </p>

          <label className="block text-sm">
            <span className="kal-label">Topic / niche (optional if you attach reference images)</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. fast food swaps for weight loss"
              className="kal-input"
            />
          </label>

          <ReferenceImagesUpload images={images} onChange={setImages} />

          <label className="block max-w-[14rem] text-sm">
            <span className="kal-label">Number of comparisons / plate sections</span>
            <input
              type="number"
              min={1}
              max={6}
              value={count}
              onChange={(e) => setCount(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
              className="kal-input"
            />
          </label>

          <button type="button" onClick={run} disabled={busy} className="kal-btn-primary">
            {busy ? "Brainstorming…" : "Brainstorm carousel"}
          </button>

          {error && (
            <p className="whitespace-pre-wrap text-xs font-semibold text-purple">{error}</p>
          )}
          {warning && <p className="text-xs font-semibold text-purple">{warning}</p>}
        </div>
      )}
    </div>
  );
}
