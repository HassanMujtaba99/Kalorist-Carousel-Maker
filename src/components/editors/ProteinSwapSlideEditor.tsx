"use client";

import { useId, useState } from "react";
import type { AppSettings, FoodItem, ProteinSwapSlideData } from "@/lib/types";
import { FoodPicker } from "../FoodPicker";
import { FoodChip } from "../FoodChip";
import { sumCalories, sumProtein } from "@/lib/nutrition";
import { draftCopy, activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { buildHeadlinePrompt, buildProteinSwapTakeawayPrompt } from "@/lib/copyAssist";

interface Props {
  data: ProteinSwapSlideData;
  usdaApiKey: string;
  settings: AppSettings;
  onChange: (data: ProteinSwapSlideData) => void;
}

export function ProteinSwapSlideEditor({ data, usdaApiKey, settings, onChange }: Props) {
  const recommendedRadioName = useId();
  const [draftingHeadline, setDraftingHeadline] = useState(false);
  const [draftingTakeaway, setDraftingTakeaway] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const addTo = (side: "leftItems" | "rightItems") => (item: FoodItem) => {
    onChange({ ...data, [side]: [...data[side], item] });
  };
  const removeFrom = (side: "leftItems" | "rightItems") => (id: string) => {
    onChange({ ...data, [side]: data[side].filter((i) => i.id !== id) });
  };

  const requireKey = () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return false;
    }
    return true;
  };

  const draftHeadline = async () => {
    if (!requireKey()) return;
    setDraftingHeadline(true);
    setError(null);
    try {
      const headline = await draftCopy(buildHeadlinePrompt(data.headline), settings);
      onChange({ ...data, headline });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDraftingHeadline(false);
    }
  };

  const draftTakeaway = async () => {
    if (!requireKey()) return;
    setDraftingTakeaway(true);
    setError(null);
    try {
      const takeaway = await draftCopy(
        buildProteinSwapTakeawayPrompt(data.leftItems, data.rightItems),
        settings
      );
      onChange({ ...data, takeaway });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDraftingTakeaway(false);
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
            disabled={draftingHeadline}
            className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
          >
            {draftingHeadline ? "Drafting…" : `Draft with ${providerLabel}`}
          </button>
        </div>
        <textarea
          value={data.headline}
          onChange={(e) => onChange({ ...data, headline: e.target.value })}
          rows={2}
          className="kal-input"
        />
      </label>
      {error && <p className="text-xs font-semibold text-purple">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {(["leftItems", "rightItems"] as const).map((side) => {
          const labelKey = side === "leftItems" ? "leftLabel" : "rightLabel";
          const sideKey = side === "leftItems" ? "left" : "right";
          const items = data[side];
          return (
            <div key={side} className="space-y-2">
              <label className="block text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="kal-label !mb-0">
                    {side === "leftItems" ? "Left" : "Right"} label
                  </span>
                  <label className="flex items-center gap-1 text-xs font-bold text-ink/60">
                    <input
                      type="radio"
                      name={recommendedRadioName}
                      checked={data.recommendedSide === sideKey}
                      onChange={() => onChange({ ...data, recommendedSide: sideKey })}
                    />
                    Recommended (gets checkmark)
                  </label>
                </div>
                <input
                  type="text"
                  value={data[labelKey]}
                  onChange={(e) => onChange({ ...data, [labelKey]: e.target.value })}
                  className="kal-input"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <FoodChip key={item.id} item={item} onRemove={() => removeFrom(side)(item.id)} />
                ))}
              </div>
              <p className="text-xs font-semibold text-ink/50">
                Total: {sumCalories(items)} cal · {sumProtein(items)}g protein
              </p>
              <FoodPicker usdaApiKey={usdaApiKey} onAdd={addTo(side)} />
            </div>
          );
        })}
      </div>

      <label className="block text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="kal-label !mb-0">Takeaway line</span>
          <button
            type="button"
            onClick={draftTakeaway}
            disabled={draftingTakeaway}
            className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
          >
            {draftingTakeaway ? "Drafting…" : `Draft with ${providerLabel}`}
          </button>
        </div>
        <input
          type="text"
          value={data.takeaway}
          onChange={(e) => onChange({ ...data, takeaway: e.target.value })}
          className="kal-input"
        />
      </label>
    </div>
  );
}
