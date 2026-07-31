"use client";

import { useEffect, useState } from "react";
import JSZip from "jszip";
import { authClient } from "@/lib/auth/client";
import { useSettings } from "@/hooks/useSettings";
import { useGuestMode } from "@/hooks/useGuestMode";
import { emptyCarousel, createSlide, CONTENT_SLIDE_KINDS } from "@/lib/carousel";
import { buildSlidePrompt } from "@/lib/promptBuilder";
import { generateSlideImage } from "@/lib/geminiClient";
import {
  createSavedCarousel,
  deleteSavedCarousel,
  listSavedCarousels,
  loadSavedCarousel,
  updateSavedCarousel,
  type CarouselSummary,
} from "@/lib/carouselsClient";
import type { Slide, SlideData, SlideKind } from "@/lib/types";
import { AuthPanel } from "./AuthPanel";
import { WelcomeGate } from "./WelcomeGate";
import { SettingsPanel } from "./SettingsPanel";
import { MyCarouselsPanel } from "./MyCarouselsPanel";
import { SlideCard } from "./SlideCard";
import { AddContentSlideButton } from "./AddContentSlideButton";

export function CarouselBuilder() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user ?? null;
  const { guest, loaded: guestLoaded, continueAsGuest } = useGuestMode();
  const { settings, update, loaded, syncStatus: settingsSyncStatus } = useSettings(
    user?.id ?? null
  );
  const [carousel, setCarousel] = useState(emptyCarousel());
  const [busy, setBusy] = useState(false);

  const [savedCarousels, setSavedCarousels] = useState<CarouselSummary[]>([]);
  const [activeCarouselId, setActiveCarouselId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedCarousels([]);
      setActiveCarouselId(null);
      return;
    }
    listSavedCarousels()
      .then(setSavedCarousels)
      .catch(() => {});
  }, [user]);

  const allSlides = [carousel.cover, ...carousel.content, carousel.cta];

  const addContentSlide = (kind: SlideKind) => {
    setCarousel((c) => ({ ...c, content: [...c.content, createSlide(kind)] }));
  };

  const removeContentSlide = (id: string) => {
    setCarousel((c) => ({ ...c, content: c.content.filter((s) => s.id !== id) }));
  };

  const moveContentSlide = (id: string, direction: -1 | 1) => {
    setCarousel((c) => {
      const idx = c.content.findIndex((s) => s.id === id);
      const newIdx = idx + direction;
      if (idx < 0 || newIdx < 0 || newIdx >= c.content.length) return c;
      const content = [...c.content];
      [content[idx], content[newIdx]] = [content[newIdx], content[idx]];
      return { ...c, content };
    });
  };

  const updateSlide = (id: string, patch: Partial<Slide>) => {
    setCarousel((c) => {
      if (c.cover.id === id) return { ...c, cover: { ...c.cover, ...patch } };
      if (c.cta.id === id) return { ...c, cta: { ...c.cta, ...patch } };
      return {
        ...c,
        content: c.content.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
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
    for (const slide of allSlides) {
      await generateSlide(slide);
    }
    setBusy(false);
  };

  const exportZip = async () => {
    const zip = new JSZip();
    allSlides.forEach((slide, i) => {
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

  const saveCarousel = async () => {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      if (activeCarouselId) {
        await updateSavedCarousel(activeCarouselId, carousel);
      } else {
        const id = await createSavedCarousel(carousel);
        setActiveCarouselId(id);
      }
      setSavedCarousels(await listSavedCarousels());
      setSaveStatus("saved");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
      setSaveStatus("error");
    }
  };

  const loadCarousel = async (id: string) => {
    try {
      const data = await loadSavedCarousel(id);
      setCarousel(data);
      setActiveCarouselId(id);
      setSaveStatus("idle");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Load failed");
      setSaveStatus("error");
    }
  };

  const deleteCarousel = async (id: string) => {
    try {
      await deleteSavedCarousel(id);
      setSavedCarousels(await listSavedCarousels());
      if (activeCarouselId === id) {
        setCarousel(emptyCarousel());
        setActiveCarouselId(null);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
      setSaveStatus("error");
    }
  };

  const startNewCarousel = () => {
    setCarousel(emptyCarousel());
    setActiveCarouselId(null);
    setSaveStatus("idle");
  };

  const generatedCount = allSlides.filter((s) => s.status === "done").length;

  if (sessionPending || !guestLoaded) return null;
  if (!user && !guest) {
    return <WelcomeGate onContinueAsGuest={continueAsGuest} />;
  }
  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Carousel Maker
        </h1>
        <p className="max-w-2xl text-sm text-ink/60">
          Build nutrition-education carousel posts. Calorie and protein figures
          are pulled live from the USDA FoodData Central database and baked
          into the AI image-generation prompt so the numbers on your slides
          are real, not hallucinated.
        </p>
      </header>

      <AuthPanel user={user} onSignOut={() => authClient.signOut()} />

      <SettingsPanel
        settings={settings}
        onChange={update}
        signedIn={!!user}
        syncStatus={settingsSyncStatus}
      />

      {user && (
        <MyCarouselsPanel
          carousels={savedCarousels}
          activeId={activeCarouselId}
          saveStatus={saveStatus}
          saveError={saveError}
          onSave={saveCarousel}
          onNew={startNewCarousel}
          onLoad={loadCarousel}
          onDelete={deleteCarousel}
        />
      )}

      <section className="kal-card grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="kal-label">Carousel title</span>
          <input
            type="text"
            value={carousel.title}
            onChange={(e) => setCarousel((c) => ({ ...c, title: e.target.value }))}
            className="kal-input"
          />
        </label>
        <label className="block text-sm">
          <span className="kal-label">Brand name (badge)</span>
          <input
            type="text"
            value={carousel.brand.name}
            onChange={(e) =>
              setCarousel((c) => ({ ...c, brand: { ...c.brand, name: e.target.value } }))
            }
            className="kal-input"
          />
        </label>
      </section>

      <section className="space-y-3">
        <span className="pl-1 text-xs font-bold tracking-wide text-ink/40 uppercase">
          Cover
        </span>
        <SlideCard
          slide={carousel.cover}
          displayNumber={1}
          usdaApiKey={settings.usdaApiKey}
          anthropicApiKey={settings.anthropicApiKey}
          anthropicModel={settings.anthropicModel}
          onChangeData={(data: SlideData) => updateSlide(carousel.cover.id, { data })}
          onGenerate={() => generateSlide(carousel.cover)}
          locked
        />

        <span className="block pt-2 pl-1 text-xs font-bold tracking-wide text-ink/40 uppercase">
          Content
        </span>
        {carousel.content.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-ink/20 bg-white/60 p-6 text-center text-sm text-ink/50">
            No content slides yet — add one below.
          </p>
        )}
        {carousel.content.map((slide, i) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            displayNumber={i + 2}
            usdaApiKey={settings.usdaApiKey}
            anthropicApiKey={settings.anthropicApiKey}
            anthropicModel={settings.anthropicModel}
            onChangeData={(data: SlideData) => updateSlide(slide.id, { data })}
            onGenerate={() => generateSlide(slide)}
            onRemove={() => removeContentSlide(slide.id)}
            onMoveUp={() => moveContentSlide(slide.id, -1)}
            onMoveDown={() => moveContentSlide(slide.id, 1)}
            canMoveUp={i > 0}
            canMoveDown={i < carousel.content.length - 1}
          />
        ))}

        <AddContentSlideButton kinds={CONTENT_SLIDE_KINDS} onAdd={addContentSlide} />

        <span className="block pt-1 pl-1 text-xs font-bold tracking-wide text-ink/40 uppercase">
          Closing
        </span>
        <SlideCard
          slide={carousel.cta}
          displayNumber={allSlides.length}
          usdaApiKey={settings.usdaApiKey}
          anthropicApiKey={settings.anthropicApiKey}
          anthropicModel={settings.anthropicModel}
          onChangeData={(data: SlideData) => updateSlide(carousel.cta.id, { data })}
          onGenerate={() => generateSlide(carousel.cta)}
          locked
        />
      </section>

      <section className="kal-card flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generateAll}
          disabled={busy}
          className="kal-btn-primary"
        >
          {busy ? "Generating all…" : "Generate all slides"}
        </button>
        <button
          type="button"
          onClick={exportZip}
          disabled={generatedCount === 0}
          className="kal-btn-secondary"
        >
          Download all as ZIP
        </button>
        <span className="kal-pill">
          {generatedCount}/{allSlides.length} generated
        </span>
      </section>
    </div>
  );
}
