"use client";

import { useState } from "react";
import JSZip from "jszip";
import { useSettings } from "@/hooks/useSettings";
import { emptyCarousel, createSlide, slideKindLabel } from "@/lib/carousel";
import { buildSlidePrompt } from "@/lib/promptBuilder";
import { generateSlideImage } from "@/lib/geminiClient";
import type { Slide, SlideData, SlideKind } from "@/lib/types";
import { SettingsPanel } from "./SettingsPanel";
import { SlideCard } from "./SlideCard";

const SLIDE_KINDS: SlideKind[] = ["title", "this-or-that", "day-on-a-plate", "cta"];

export function CarouselBuilder() {
  const { settings, update, loaded } = useSettings();
  const [carousel, setCarousel] = useState(emptyCarousel());
  const [busy, setBusy] = useState(false);

  const addSlide = (kind: SlideKind) => {
    setCarousel((c) => ({ ...c, slides: [...c.slides, createSlide(kind)] }));
  };

  const updateSlide = (id: string, patch: Partial<Slide>) => {
    setCarousel((c) => ({
      ...c,
      slides: c.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const removeSlide = (id: string) => {
    setCarousel((c) => ({ ...c, slides: c.slides.filter((s) => s.id !== id) }));
  };

  const moveSlide = (id: string, direction: -1 | 1) => {
    setCarousel((c) => {
      const idx = c.slides.findIndex((s) => s.id === id);
      const newIdx = idx + direction;
      if (idx < 0 || newIdx < 0 || newIdx >= c.slides.length) return c;
      const slides = [...c.slides];
      [slides[idx], slides[newIdx]] = [slides[newIdx], slides[idx]];
      return { ...c, slides };
    });
  };

  const generateSlide = async (slide: Slide) => {
    if (!settings.geminiApiKey.trim()) {
      updateSlide(slide.id, { status: "error", error: "Add your Gemini API key in Settings first." });
      return;
    }
    updateSlide(slide.id, { status: "generating", error: undefined });
    try {
      const prompt = buildSlidePrompt(slide.data, carousel.brand);
      const imageDataUrl = await generateSlideImage(
        prompt,
        settings.geminiApiKey,
        settings.geminiModel
      );
      updateSlide(slide.id, { status: "done", imageDataUrl });
    } catch (e) {
      updateSlide(slide.id, {
        status: "error",
        error: e instanceof Error ? e.message : "Generation failed",
      });
    }
  };

  const generateAll = async () => {
    setBusy(true);
    for (const slide of carousel.slides) {
      await generateSlide(slide);
    }
    setBusy(false);
  };

  const exportZip = async () => {
    const zip = new JSZip();
    carousel.slides.forEach((slide, i) => {
      if (!slide.imageDataUrl) return;
      const base64 = slide.imageDataUrl.split(",")[1];
      zip.file(`slide-${i + 1}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${carousel.title.replace(/\s+/g, "-").toLowerCase() || "carousel"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatedCount = carousel.slides.filter((s) => s.status === "done").length;

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Kalorist Carousel Maker</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Build nutrition-education carousel posts. Calorie and protein figures
          are pulled live from the USDA FoodData Central database and baked
          into the AI image-generation prompt so the numbers on your slides
          are real, not hallucinated.
        </p>
      </header>

      <SettingsPanel settings={settings} onChange={update} />

      <section className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 dark:bg-neutral-900 dark:border-white/10 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Carousel title</span>
          <input
            type="text"
            value={carousel.title}
            onChange={(e) => setCarousel((c) => ({ ...c, title: e.target.value }))}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Brand name (badge)</span>
          <input
            type="text"
            value={carousel.brand.name}
            onChange={(e) =>
              setCarousel((c) => ({ ...c, brand: { ...c.brand, name: e.target.value } }))
            }
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
          />
        </label>
      </section>

      <section className="space-y-3">
        {carousel.slides.length === 0 && (
          <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            Add your first slide below to get started.
          </p>
        )}
        {carousel.slides.map((slide, i) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            index={i}
            total={carousel.slides.length}
            usdaApiKey={settings.usdaApiKey}
            onChangeData={(data: SlideData) => updateSlide(slide.id, { data })}
            onGenerate={() => generateSlide(slide)}
            onRemove={() => removeSlide(slide.id)}
            onMove={(dir) => moveSlide(slide.id, dir)}
          />
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 bg-white p-4 dark:bg-neutral-900 dark:border-white/10">
        <span className="mr-1 text-sm font-medium text-black/60 dark:text-white/60">
          Add slide:
        </span>
        {SLIDE_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => addSlide(kind)}
            className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            + {slideKindLabel(kind)}
          </button>
        ))}
      </section>

      {carousel.slides.length > 0 && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white p-4 dark:bg-neutral-900 dark:border-white/10">
          <button
            type="button"
            onClick={generateAll}
            disabled={busy}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Generating all…" : "Generate all slides"}
          </button>
          <button
            type="button"
            onClick={exportZip}
            disabled={generatedCount === 0}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-white/15"
          >
            Download all as ZIP
          </button>
          <span className="text-xs text-black/50 dark:text-white/50">
            {generatedCount}/{carousel.slides.length} slides generated
          </span>
        </section>
      )}
    </div>
  );
}
