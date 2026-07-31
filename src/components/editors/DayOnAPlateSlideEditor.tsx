"use client";

import type { DayOnAPlateSlideData, FoodItem } from "@/lib/types";
import { FoodPicker } from "../FoodPicker";
import { FoodChip } from "../FoodChip";
import { sumCalories, sumProtein } from "@/lib/nutrition";

interface Props {
  data: DayOnAPlateSlideData;
  usdaApiKey: string;
  onChange: (data: DayOnAPlateSlideData) => void;
}

export function DayOnAPlateSlideEditor({ data, usdaApiKey, onChange }: Props) {
  const updateSection = (id: string, patch: Partial<DayOnAPlateSlideData["sections"][number]>) => {
    onChange({
      ...data,
      sections: data.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const allItems = data.sections.flatMap((s) => s.items);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {data.sections.map((section) => (
          <div key={section.id} className="space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
            <input
              type="text"
              value={section.label}
              onChange={(e) => updateSection(section.id, { label: e.target.value })}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
            />
            <div className="flex flex-wrap gap-1.5">
              {section.items.map((item) => (
                <FoodChip
                  key={item.id}
                  item={item}
                  onRemove={() =>
                    updateSection(section.id, {
                      items: section.items.filter((i) => i.id !== item.id),
                    })
                  }
                />
              ))}
            </div>
            <FoodPicker
              usdaApiKey={usdaApiKey}
              onAdd={(item: FoodItem) =>
                updateSection(section.id, { items: [...section.items, item] })
              }
            />
          </div>
        ))}
      </div>
      <p className="text-sm font-medium">
        Total: {sumCalories(allItems)} cal · {sumProtein(allItems)}g protein
      </p>
    </div>
  );
}
