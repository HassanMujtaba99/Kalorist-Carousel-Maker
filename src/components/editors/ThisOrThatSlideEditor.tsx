"use client";

import type { FoodItem, ThisOrThatSlideData } from "@/lib/types";
import { FoodPicker } from "../FoodPicker";
import { FoodChip } from "../FoodChip";
import { sumCalories } from "@/lib/nutrition";

interface Props {
  data: ThisOrThatSlideData;
  usdaApiKey: string;
  onChange: (data: ThisOrThatSlideData) => void;
}

export function ThisOrThatSlideEditor({ data, usdaApiKey, onChange }: Props) {
  const addTo = (side: "leftItems" | "rightItems") => (item: FoodItem) => {
    onChange({ ...data, [side]: [...data[side], item] });
  };
  const removeFrom =
    (side: "leftItems" | "rightItems") => (id: string) => {
      onChange({ ...data, [side]: data[side].filter((i) => i.id !== id) });
    };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Left label</span>
          <input
            type="text"
            value={data.leftLabel}
            onChange={(e) => onChange({ ...data, leftLabel: e.target.value })}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {data.leftItems.map((item) => (
            <FoodChip key={item.id} item={item} onRemove={() => removeFrom("leftItems")(item.id)} />
          ))}
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          Total: {sumCalories(data.leftItems)} cal
        </p>
        <FoodPicker usdaApiKey={usdaApiKey} onAdd={addTo("leftItems")} />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Right label</span>
          <input
            type="text"
            value={data.rightLabel}
            onChange={(e) => onChange({ ...data, rightLabel: e.target.value })}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {data.rightItems.map((item) => (
            <FoodChip key={item.id} item={item} onRemove={() => removeFrom("rightItems")(item.id)} />
          ))}
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          Total: {sumCalories(data.rightItems)} cal
        </p>
        <FoodPicker usdaApiKey={usdaApiKey} onAdd={addTo("rightItems")} />
      </div>
    </div>
  );
}
