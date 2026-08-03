"use client";

import { useState } from "react";
import type { AppSettings, CarouselBrand, FoodItem } from "@/lib/types";
import type { PlateSectionRecreateInput } from "@/lib/recreateTypes";
import { newId } from "@/lib/carousel";
import { ImageUpload } from "../ImageUpload";
import { FoodPicker } from "../FoodPicker";
import { FoodChip } from "../FoodChip";
import { sumCalories, sumProtein } from "@/lib/nutrition";
import { generateSlideImage } from "@/lib/geminiClient";
import { buildDayOnAPlateRecreatePrompt } from "@/lib/recreatePromptBuilder";
import { ResultPreview } from "./ResultPreview";

interface Props {
  settings: AppSettings;
  brand: CarouselBrand;
}

function defaultSections(): PlateSectionRecreateInput[] {
  return [
    { id: newId("section"), label: "Breakfast", items: [], photo: null },
    { id: newId("section"), label: "Lunch", items: [], photo: null },
    { id: newId("section"), label: "Dinner", items: [], photo: null },
    { id: newId("section"), label: "Snacks", items: [], photo: null },
  ];
}

export function DayOnAPlateRecreator({ settings, brand }: Props) {
  const [sections, setSections] = useState<PlateSectionRecreateInput[]>(defaultSections);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const updateSection = (id: string, patch: Partial<PlateSectionRecreateInput>) => {
    setSections((secs) => secs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const allItems = sections.flatMap((s) => s.items);

  const generate = async () => {
    if (!settings.geminiApiKey.trim()) {
      setError("Add your Gemini API key in Settings first.");
      return;
    }
    if (allItems.length === 0) {
      setError("Add at least one food item to a section (for real calorie numbers).");
      return;
    }
    setGenerating(true);
    setError(null);
    setResultUrl(null);
    try {
      const prompt = buildDayOnAPlateRecreatePrompt(sections, brand);
      const images = sections.map((s) => s.photo).filter((p): p is string => !!p);
      const url = await generateSlideImage(
        prompt,
        settings.geminiApiKey,
        settings.geminiModel,
        images.length ? images : undefined
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
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <div key={section.id} className="space-y-2 rounded-xl border-2 border-ink/15 p-3">
              <input
                type="text"
                value={section.label}
                onChange={(e) => updateSection(section.id, { label: e.target.value })}
                className="kal-input font-bold"
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
                usdaApiKey={settings.usdaApiKey}
                onAdd={(item: FoodItem) =>
                  updateSection(section.id, { items: [...section.items, item] })
                }
              />
              <ImageUpload
                label="Photo (optional)"
                photo={section.photo}
                onChange={(photo) => updateSection(section.id, { photo })}
              />
            </div>
          ))}
        </div>
        <p className="text-sm font-bold text-ink">
          Total: {sumCalories(allItems)} cal · {sumProtein(allItems)}g protein
        </p>
        <button type="button" onClick={generate} disabled={generating} className="kal-btn-primary">
          {generating ? "Generating…" : "Generate slide"}
        </button>
        {error && <p className="text-xs font-semibold text-purple">{error}</p>}
      </div>
      <ResultPreview url={resultUrl} generating={generating} filename="recreated-day-on-a-plate.png" />
    </div>
  );
}
