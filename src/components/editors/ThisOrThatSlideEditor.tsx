"use client";

import { useState } from "react";
import type { AppSettings, FoodItem, ThisOrThatSlideData } from "@/lib/types";
import { FoodPicker } from "../FoodPicker";
import { FoodChip } from "../FoodChip";
import { sumCalories } from "@/lib/nutrition";
import { draftCopy, activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { buildThisOrThatLabelsPrompt, parseThisOrThatLabels } from "@/lib/copyAssist";

interface Props {
  data: ThisOrThatSlideData;
  usdaApiKey: string;
  settings: AppSettings;
  onChange: (data: ThisOrThatSlideData) => void;
}

export function ThisOrThatSlideEditor({
  data,
  usdaApiKey,
  settings,
  onChange,
}: Props) {
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const addTo = (side: "leftItems" | "rightItems") => (item: FoodItem) => {
    onChange({ ...data, [side]: [...data[side], item] });
  };
  const removeFrom =
    (side: "leftItems" | "rightItems") => (id: string) => {
      onChange({ ...data, [side]: data[side].filter((i) => i.id !== id) });
    };

  const draftLabels = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const text = await draftCopy(
        buildThisOrThatLabelsPrompt(
          data.leftLabel,
          data.rightLabel,
          data.leftItems,
          data.rightItems
        ),
        settings
      );
      const parsed = parseThisOrThatLabels(text);
      if (!parsed) {
        setError(`Couldn't parse ${providerLabel}'s response — try again.`);
        return;
      }
      onChange({ ...data, leftLabel: parsed.left, rightLabel: parsed.right });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-ink/40 uppercase">
          Labels
        </span>
        <button
          type="button"
          onClick={draftLabels}
          disabled={drafting}
          className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
        >
          {drafting ? "Drafting…" : `Draft labels with ${providerLabel}`}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-purple">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="kal-label">Left label</span>
            <input
              type="text"
              value={data.leftLabel}
              onChange={(e) => onChange({ ...data, leftLabel: e.target.value })}
              className="kal-input"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {data.leftItems.map((item) => (
              <FoodChip key={item.id} item={item} onRemove={() => removeFrom("leftItems")(item.id)} />
            ))}
          </div>
          <p className="text-xs font-semibold text-ink/50">
            Total: {sumCalories(data.leftItems)} cal
          </p>
          <FoodPicker usdaApiKey={usdaApiKey} onAdd={addTo("leftItems")} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            <span className="kal-label">Right label</span>
            <input
              type="text"
              value={data.rightLabel}
              onChange={(e) => onChange({ ...data, rightLabel: e.target.value })}
              className="kal-input"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {data.rightItems.map((item) => (
              <FoodChip key={item.id} item={item} onRemove={() => removeFrom("rightItems")(item.id)} />
            ))}
          </div>
          <p className="text-xs font-semibold text-ink/50">
            Total: {sumCalories(data.rightItems)} cal
          </p>
          <FoodPicker usdaApiKey={usdaApiKey} onAdd={addTo("rightItems")} />
        </div>
      </div>
    </div>
  );
}
