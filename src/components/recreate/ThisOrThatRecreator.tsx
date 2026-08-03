"use client";

import { useState } from "react";
import type { AppSettings, CarouselBrand, FoodItem } from "@/lib/types";
import type { FoodWithPhoto } from "@/lib/recreateTypes";
import { ImageUpload } from "../ImageUpload";
import { FoodPicker } from "../FoodPicker";
import { FoodChip } from "../FoodChip";
import { sumCalories } from "@/lib/nutrition";
import { generateSlideImage } from "@/lib/geminiClient";
import { draftCopy, activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import { buildThisOrThatLabelsPrompt, parseThisOrThatLabels } from "@/lib/copyAssist";
import { buildThisOrThatRecreatePrompt } from "@/lib/recreatePromptBuilder";
import { ResultPreview } from "./ResultPreview";

interface Props {
  settings: AppSettings;
  brand: CarouselBrand;
}

export function ThisOrThatRecreator({ settings, brand }: Props) {
  const [left, setLeft] = useState<FoodWithPhoto>({ label: "Option A", items: [], photo: null });
  const [right, setRight] = useState<FoodWithPhoto>({ label: "Option B", items: [], photo: null });
  const [drafting, setDrafting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const draftLabels = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const text = await draftCopy(
        buildThisOrThatLabelsPrompt(left.label, right.label, left.items, right.items),
        settings
      );
      const parsed = parseThisOrThatLabels(text);
      if (!parsed) {
        setError(`Couldn't parse ${providerLabel}'s response — try again.`);
        return;
      }
      setLeft((l) => ({ ...l, label: parsed.left }));
      setRight((r) => ({ ...r, label: parsed.right }));
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
    if (left.items.length === 0 || right.items.length === 0) {
      setError("Add at least one food item to each side (for real calorie numbers).");
      return;
    }
    setGenerating(true);
    setError(null);
    setResultUrl(null);
    try {
      const prompt = buildThisOrThatRecreatePrompt(left, right, brand);
      const images = [left.photo, right.photo].filter((p): p is string => !!p);
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

  const addTo = (side: "left" | "right") => (item: FoodItem) => {
    const setter = side === "left" ? setLeft : setRight;
    setter((s) => ({ ...s, items: [...s.items, item] }));
  };
  const removeFrom = (side: "left" | "right") => (id: string) => {
    const setter = side === "left" ? setLeft : setRight;
    setter((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-ink/40 uppercase">Labels</span>
          <button
            type="button"
            onClick={draftLabels}
            disabled={drafting}
            className="text-xs font-bold text-purple hover:underline disabled:opacity-50"
          >
            {drafting ? "Drafting…" : `Draft labels with ${providerLabel}`}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(["left", "right"] as const).map((side) => {
            const state = side === "left" ? left : right;
            const setState = side === "left" ? setLeft : setRight;
            return (
              <div key={side} className="space-y-2">
                <label className="block text-sm">
                  <span className="kal-label">{side === "left" ? "Left" : "Right"} label</span>
                  <input
                    type="text"
                    value={state.label}
                    onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
                    className="kal-input"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {state.items.map((item) => (
                    <FoodChip key={item.id} item={item} onRemove={() => removeFrom(side)(item.id)} />
                  ))}
                </div>
                <p className="text-xs font-semibold text-ink/50">
                  Total: {sumCalories(state.items)} cal
                </p>
                <FoodPicker usdaApiKey={settings.usdaApiKey} onAdd={addTo(side)} />
                <ImageUpload
                  label={`${side === "left" ? "Left" : "Right"} photo (optional)`}
                  photo={state.photo}
                  onChange={(photo) => setState((s) => ({ ...s, photo }))}
                />
              </div>
            );
          })}
        </div>

        <button type="button" onClick={generate} disabled={generating} className="kal-btn-primary">
          {generating ? "Generating…" : "Generate slide"}
        </button>
        {error && <p className="text-xs font-semibold text-purple">{error}</p>}
      </div>
      <ResultPreview url={resultUrl} generating={generating} filename="recreated-this-or-that.png" />
    </div>
  );
}
