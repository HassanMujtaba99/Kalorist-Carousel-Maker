"use client";

import { useState } from "react";
import Link from "next/link";
import JSZip from "jszip";
import { authClient } from "@/lib/auth/client";
import { useSettings } from "@/hooks/useSettings";
import { useGuestMode } from "@/hooks/useGuestMode";
import { emptyCarousel, newId } from "@/lib/carousel";
import { buildSlidePrompt, slidePhotos } from "@/lib/promptBuilder";
import { generateSlideImage } from "@/lib/geminiClient";
import { detectImageItems } from "@/lib/geminiVisionClient";
import {
  brainstormCarousel,
  BRAINSTORM_FORMATS,
  type BrainstormFormat,
} from "@/lib/carouselBrainstorm";
import { activeCopyApiKey, copyProviderLabel } from "@/lib/copyProvider";
import type { AnnotatedItem, ReferenceAnalysis } from "@/lib/studioTypes";
import type { CarouselState, Slide, SlideData } from "@/lib/types";
import { WelcomeGate } from "./WelcomeGate";
import { AuthPanel } from "./AuthPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ReferenceImagesUpload } from "./ReferenceImagesUpload";
import { ImageItemAnnotator } from "./studio/ImageItemAnnotator";
import { BadgeTemplatePicker } from "./BadgeTemplatePicker";
import { SlideCard } from "./SlideCard";

type Step = "upload" | "review" | "idea" | "slides";

const STYLE_MATCH_SUFFIX = `

A reference image is attached purely for VISUAL STYLE matching — match its
color palette, layout composition, and typography treatment, but do NOT
copy its specific content, text, food items, logos, or exact composition.
Generate the content described above in that same visual style.`;

export function StudioBuilder() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user ?? null;
  const { guest, loaded: guestLoaded, continueAsGuest } = useGuestMode();
  const { settings, update, loaded, syncStatus } = useSettings(user?.id ?? null);
  const providerLabel = copyProviderLabel(settings.copyProvider);

  const [step, setStep] = useState<Step>("upload");

  // Step 1
  const [images, setImages] = useState<string[]>([]);
  const [valueProposition, setValueProposition] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Step 2
  const [references, setReferences] = useState<ReferenceAnalysis[]>([]);

  // Step 3
  const [format, setFormat] = useState<BrainstormFormat | "auto">("auto");
  const [count, setCount] = useState(3);
  const [ideaBusy, setIdeaBusy] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [ideaWarning, setIdeaWarning] = useState<string | null>(null);
  const [ideaNotice, setIdeaNotice] = useState<string | null>(null);

  // Step 4
  const [carousel, setCarousel] = useState<CarouselState | null>(null);
  const [busy, setBusy] = useState(false);

  const startAnalysis = async () => {
    setUploadError(null);
    if (!settings.geminiApiKey.trim()) {
      setUploadError("Add your Gemini API key in Settings first.");
      return;
    }
    if (images.length === 0) {
      setUploadError("Attach at least one reference image.");
      return;
    }
    if (!valueProposition.trim()) {
      setUploadError(
        "Describe the value this content provides to the viewer — that's what grounds the new idea in step 3."
      );
      return;
    }

    const initial: ReferenceAnalysis[] = images.map((image) => ({
      id: newId("ref"),
      image,
      items: [],
      status: "pending",
    }));
    setReferences(initial);
    setStep("review");

    await Promise.all(
      initial.map(async (ref) => {
        setReferences((prev) =>
          prev.map((r) => (r.id === ref.id ? { ...r, status: "analyzing" } : r))
        );
        try {
          const boxes = await detectImageItems(
            ref.image,
            settings.geminiApiKey,
            settings.geminiCopyModel
          );
          const items: AnnotatedItem[] = boxes.map((b) => ({ id: newId("item"), ...b }));
          setReferences((prev) =>
            prev.map((r) => (r.id === ref.id ? { ...r, items, status: "done" } : r))
          );
        } catch (e) {
          setReferences((prev) =>
            prev.map((r) =>
              r.id === ref.id
                ? { ...r, status: "error", error: e instanceof Error ? e.message : "Analysis failed" }
                : r
            )
          );
        }
      })
    );
  };

  const updateReferenceItems = (id: string, items: AnnotatedItem[]) => {
    setReferences((prev) => prev.map((r) => (r.id === id ? { ...r, items } : r)));
  };

  const analyzing = references.some((r) => r.status === "analyzing" || r.status === "pending");

  const generateIdea = async () => {
    if (!activeCopyApiKey(settings).trim()) {
      setIdeaError(`Add your ${providerLabel} API key in Settings first.`);
      return;
    }
    setIdeaBusy(true);
    setIdeaError(null);
    setIdeaWarning(null);
    setIdeaNotice(null);
    try {
      const itemLines = references
        .map((r, i) => {
          const names = r.items.map((it) => it.label).join(", ");
          return `Reference image ${i + 1} identified items: ${names || "(none identified)"}`;
        })
        .join("\n");
      const extraContext = `The value this content should provide to the viewer (why it performs well): "${valueProposition.trim()}"

${itemLines}

Use the identified items above as concrete inspiration for the specific kinds of real foods/items to feature and the overall theme — but generate entirely NEW content, not a copy of what's shown.`;

      const result = await brainstormCarousel(
        "",
        references.map((r) => r.image),
        count,
        "",
        "",
        format === "auto" ? null : format,
        settings,
        extraContext
      );

      const warnings: string[] = [];
      if (result.usdaErrorCount > 0) {
        warnings.push(
          `${result.usdaErrorCount} food lookup${result.usdaErrorCount === 1 ? "" : "s"} failed because the USDA API itself errored (${result.usdaErrorSample}) — not because the data doesn't exist. If you're on the shared demo USDA key, add your own free one in Settings (api.data.gov/signup) and regenerate.`
        );
      }
      if (result.unresolvedComparisons.length > 0) {
        warnings.push(
          `Couldn't find USDA data for: ${result.unresolvedComparisons.join(", ")} — those slides were still added, just review/replace the food picks before generating.`
        );
      }
      if (warnings.length > 0) setIdeaWarning(warnings.join(" "));
      if (result.approximatedItems.length > 0) {
        setIdeaNotice(
          `USDA didn't have data for the exact item on ${result.approximatedItems.length} pick${result.approximatedItems.length === 1 ? "" : "s"}, so a generic equivalent's real numbers were used instead (marked ≈ on the food chip): ${result.approximatedItems.join(", ")}.`
        );
      }

      const base = emptyCarousel();
      setCarousel({
        ...base,
        cover: result.cover,
        content: result.content,
        cta: result.cta,
      });
      setStep("slides");
    } catch (e) {
      setIdeaError(e instanceof Error ? e.message : "Brainstorm failed");
    } finally {
      setIdeaBusy(false);
    }
  };

  const updateSlide = (id: string, patch: Partial<Slide>) => {
    setCarousel((c) => {
      if (!c) return c;
      if (c.cover.id === id) return { ...c, cover: { ...c.cover, ...patch } };
      if (c.cta.id === id) return { ...c, cta: { ...c.cta, ...patch } };
      return { ...c, content: c.content.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
    });
  };

  const generateSlide = async (slide: Slide) => {
    if (!carousel) return;
    if (!settings.geminiApiKey.trim()) {
      updateSlide(slide.id, { status: "error", error: "Add your Gemini API key in Settings first." });
      return;
    }
    updateSlide(slide.id, { status: "generating", error: undefined });
    try {
      const ownPhotos = slidePhotos(slide.data);
      const styleImages = references.slice(0, 2).map((r) => r.image);
      const usingStyleImages = ownPhotos.length === 0 && styleImages.length > 0;
      const prompt =
        buildSlidePrompt(slide.data, carousel.brand) + (usingStyleImages ? STYLE_MATCH_SUFFIX : "");
      const imageDataUrl = await generateSlideImage(
        prompt,
        settings.geminiApiKey,
        settings.geminiModel,
        ownPhotos.length > 0 ? ownPhotos : styleImages
      );
      updateSlide(slide.id, { status: "done", imageDataUrl });
    } catch (e) {
      updateSlide(slide.id, {
        status: "error",
        error: e instanceof Error ? e.message : "Generation failed",
      });
    }
  };

  const allSlides = carousel ? [carousel.cover, ...carousel.content, carousel.cta] : [];
  const generatedCount = allSlides.filter((s) => s.status === "done").length;

  const generateAll = async () => {
    setBusy(true);
    for (const slide of allSlides) {
      await generateSlide(slide);
    }
    setBusy(false);
  };

  const exportZip = async () => {
    if (!carousel) return;
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

  const startOver = () => {
    setStep("upload");
    setImages([]);
    setValueProposition("");
    setReferences([]);
    setCarousel(null);
  };

  if (sessionPending || !guestLoaded) return null;
  if (!user && !guest) {
    return <WelcomeGate onContinueAsGuest={continueAsGuest} />;
  }
  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Studio</h1>
          <Link href="/" className="text-sm font-semibold text-purple hover:underline">
            ← Back to Carousel Maker
          </Link>
        </div>
        <p className="max-w-2xl text-sm text-ink/60">
          Share reference posts, confirm what the AI sees in them, then generate a
          brand-new carousel grounded in those items and styled to match — every
          calorie/protein number is still a real, live USDA FoodData Central
          lookup, never invented by the model.
        </p>
      </header>

      <AuthPanel user={user} onSignOut={() => authClient.signOut()} />
      <SettingsPanel settings={settings} onChange={update} signedIn={!!user} syncStatus={syncStatus} />

      <div className="kal-card !p-0 overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b-2 border-ink px-4 py-3">
          {(
            [
              ["upload", "1. References"],
              ["review", "2. Identify items"],
              ["idea", "3. Generate idea"],
              ["slides", "4. Generate images"],
            ] as [Step, string][]
          ).map(([s, label]) => (
            <span
              key={s}
              className={
                step === s
                  ? "kal-pill"
                  : "rounded-full px-3 py-1.5 text-xs font-bold text-ink/40"
              }
            >
              {label}
            </span>
          ))}
        </div>

        <div className="space-y-4 p-4">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-ink/60">
                Attach the carousel posts you want this one to be inspired by, and
                describe what makes them work — the specific value they give the
                viewer that makes people stop scrolling and save the post.
              </p>
              <ReferenceImagesUpload images={images} onChange={setImages} maxImages={6} />
              <label className="block text-sm">
                <span className="kal-label">
                  What value does this content provide the viewer?
                </span>
                <textarea
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  rows={3}
                  placeholder="e.g. shows a quick, concrete before/after swap so the viewer immediately knows what to order differently next time"
                  className="kal-input"
                />
              </label>
              <button type="button" onClick={startAnalysis} className="kal-btn-primary">
                Analyze references
              </button>
              {uploadError && <p className="text-xs font-semibold text-purple">{uploadError}</p>}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <p className="text-sm text-ink/60">
                Gemini did a best-effort pass at identifying items in each image —
                boxes can be off-position or wrong-sized, or it can miss things.
                Drag to reposition, drag the corner handle to resize, edit names
                below, remove anything wrong, and add anything missed.
              </p>
              {references.map((ref, i) => (
                <div key={ref.id} className="space-y-2 border-t-2 border-dashed border-ink/15 pt-4">
                  <span className="text-xs font-bold tracking-wide text-ink/40 uppercase">
                    Reference {i + 1}
                  </span>
                  {ref.status === "analyzing" || ref.status === "pending" ? (
                    <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-ink/20 text-sm text-ink/40">
                      Analyzing…
                    </div>
                  ) : (
                    <>
                      {ref.status === "error" && (
                        <p className="text-xs font-semibold text-purple">
                          Automatic detection failed ({ref.error}) — you can still add items
                          for this reference manually below.
                        </p>
                      )}
                      <ImageItemAnnotator
                        image={ref.image}
                        items={ref.items}
                        onChange={(items) => updateReferenceItems(ref.id, items)}
                      />
                    </>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep("upload")} className="kal-btn-ghost">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("idea")}
                  disabled={analyzing}
                  className="kal-btn-primary"
                >
                  {analyzing ? "Still analyzing…" : "Continue"}
                </button>
              </div>
            </div>
          )}

          {step === "idea" && (
            <div className="space-y-4">
              <p className="text-sm text-ink/60">
                {`${providerLabel} will brainstorm a full new carousel — cover headline, content slide(s), and a closing CTA — grounded in the value proposition and identified items from step 2.`}
              </p>

              <div>
                <span className="kal-label">Content format</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat("auto")}
                    className={format === "auto" ? "kal-pill" : "kal-btn-ghost"}
                  >
                    Let AI decide
                  </button>
                  {BRAINSTORM_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={format === f.id ? "kal-pill" : "kal-btn-ghost"}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {format !== "protein-swap" && (
                <label className="block max-w-[16rem] text-sm">
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
              )}

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep("review")} className="kal-btn-ghost">
                  ← Back
                </button>
                <button type="button" onClick={generateIdea} disabled={ideaBusy} className="kal-btn-primary">
                  {ideaBusy ? "Brainstorming…" : "Generate idea"}
                </button>
              </div>

              {ideaError && (
                <p className="whitespace-pre-wrap text-xs font-semibold text-purple">{ideaError}</p>
              )}
              {ideaWarning && <p className="text-xs font-semibold text-purple">{ideaWarning}</p>}
              {ideaNotice && <p className="text-xs font-semibold text-ink/60">{ideaNotice}</p>}
            </div>
          )}

          {step === "slides" && carousel && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep("idea")} className="kal-btn-ghost">
                  ← Regenerate idea
                </button>
                <button type="button" onClick={startOver} className="kal-btn-ghost">
                  Start over
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="kal-label">Carousel title</span>
                  <input
                    type="text"
                    value={carousel.title}
                    onChange={(e) => setCarousel((c) => c && { ...c, title: e.target.value })}
                    className="kal-input"
                  />
                </label>
                <label className="block text-sm">
                  <span className="kal-label">Brand name (badge)</span>
                  <input
                    type="text"
                    value={carousel.brand.name}
                    onChange={(e) =>
                      setCarousel((c) => c && { ...c, brand: { ...c.brand, name: e.target.value } })
                    }
                    className="kal-input"
                  />
                </label>
                <div className="sm:col-span-2">
                  <BadgeTemplatePicker
                    value={carousel.brand.badgeTemplate}
                    onChange={(badgeTemplate) =>
                      setCarousel((c) => c && { ...c, brand: { ...c.brand, badgeTemplate } })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <span className="pl-1 text-xs font-bold tracking-wide text-ink/40 uppercase">Cover</span>
                <SlideCard
                  slide={carousel.cover}
                  displayNumber={1}
                  usdaApiKey={settings.usdaApiKey}
                  settings={settings}
                  onChangeData={(data: SlideData) => updateSlide(carousel.cover.id, { data })}
                  onGenerate={() => generateSlide(carousel.cover)}
                  locked
                />

                <span className="block pt-2 pl-1 text-xs font-bold tracking-wide text-ink/40 uppercase">
                  Content
                </span>
                {carousel.content.map((slide, i) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    displayNumber={i + 2}
                    usdaApiKey={settings.usdaApiKey}
                    settings={settings}
                    onChangeData={(data: SlideData) => updateSlide(slide.id, { data })}
                    onGenerate={() => generateSlide(slide)}
                    locked
                  />
                ))}

                <span className="block pt-1 pl-1 text-xs font-bold tracking-wide text-ink/40 uppercase">
                  Closing
                </span>
                <SlideCard
                  slide={carousel.cta}
                  displayNumber={allSlides.length}
                  usdaApiKey={settings.usdaApiKey}
                  settings={settings}
                  onChangeData={(data: SlideData) => updateSlide(carousel.cta.id, { data })}
                  onGenerate={() => generateSlide(carousel.cta)}
                  locked
                />
              </div>

              <div className="kal-card flex flex-wrap items-center gap-3">
                <button type="button" onClick={generateAll} disabled={busy} className="kal-btn-primary">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
