"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { newId } from "@/lib/carousel";
import { fetchImageModels, generateSlideImage } from "@/lib/geminiClient";
import { ModelPickerField } from "./ModelPickerField";
import { ReferenceImagesUpload } from "./ReferenceImagesUpload";
import { AttachmentsUpload, type Attachment } from "./AttachmentsUpload";

const STORAGE_KEY = "kalorist:image-lab";
const DEFAULT_MODEL = "gemini-2.5-flash-image";

interface Persisted {
  apiKey: string;
  model: string;
}

function loadPersisted(): Persisted {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { apiKey: "", model: DEFAULT_MODEL, ...JSON.parse(raw) };
  } catch {
    // ignore malformed local storage
  }
  return { apiKey: "", model: DEFAULT_MODEL };
}

interface HistoryEntry {
  id: string;
  prompt: string;
  imageDataUrl: string;
}

/** Builds the final prompt actually sent to the model, weaving in the
 * user's raw prompt plus a structured description of the attached
 * generation inputs and style references so the model can connect labels
 * mentioned in the prompt text to the images it's given. */
function buildFinalPrompt(userPrompt: string, attachments: Attachment[], references: string[]): string {
  const parts = [userPrompt.trim()];

  if (attachments.length > 0) {
    const lines = attachments
      .map((a, i) => `${i + 1}. ${a.label.trim() || `Attachment ${i + 1}`}`)
      .join("\n");
    parts.push(
      `\n\nAttached generation inputs, in this order (use these directly wherever the prompt above refers to them by label):\n${lines}`
    );
  }

  if (references.length > 0) {
    parts.push(
      `\n\n${references.length} additional reference image${
        references.length === 1 ? " is" : "s are"
      } attached purely for visual style, mood, and tone context — do not copy their exact content or composition, just let them inform the aesthetic of the result.`
    );
  }

  return parts.join("");
}

export function ImageLabBuilder() {
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);

  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const persisted = loadPersisted();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(persisted.apiKey);
    setModel(persisted.model);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, model }));
    } catch {
      // storage may be unavailable (e.g. private browsing) — keep in memory
    }
  }, [apiKey, model, loaded]);

  const insertLabel = (label: string) => {
    setPrompt((p) => (p.trim().length === 0 ? label : `${p.replace(/\s+$/, "")} ${label}`));
  };

  const generate = async () => {
    setError(null);
    if (!apiKey.trim()) {
      setError("Add your Gemini API key first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Write a prompt describing the image you want.");
      return;
    }
    setBusy(true);
    try {
      const finalPrompt = buildFinalPrompt(prompt, attachments, references);
      const images = [...attachments.map((a) => a.image), ...references];
      const imageDataUrl = await generateSlideImage(finalPrompt, apiKey, model, images);
      setResultImage(imageDataUrl);
      setHistory((h) => [{ id: newId("gen"), prompt, imageDataUrl }, ...h].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadImage = (dataUrl: string, index: number) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `image-lab-${index}.png`;
    a.click();
  };

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Image Lab</h1>
          <Link href="/" className="text-sm font-semibold text-purple hover:underline">
            ← Back to Carousel Maker
          </Link>
        </div>
        <p className="max-w-2xl text-sm text-ink/60">
          A standalone image generation playground — pick a model, write a
          prompt, and optionally attach reference images for style context
          plus labeled attachments the prompt can call out directly.
        </p>
      </header>

      <div className="kal-card space-y-4">
        <label className="block text-sm">
          <span className="kal-label">
            Gemini API key <span className="text-purple">*</span>
          </span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="kal-input"
          />
          <span className="mt-1 block text-xs text-ink/45">
            Get one at Google AI Studio (aistudio.google.com/apikey). Stored
            only in this browser.
          </span>
        </label>

        <ModelPickerField
          label="Image generation model"
          apiKey={apiKey}
          model={model}
          modelPlaceholder={DEFAULT_MODEL}
          fetchModels={fetchImageModels}
          onModelChange={setModel}
          noKeyMessage="Add your Gemini API key above first."
        />
      </div>

      <div className="kal-card space-y-4">
        <label className="block text-sm">
          <span className="kal-label">Prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Describe the image you want generated..."
            className="kal-input"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-t-2 border-dashed border-ink/15 pt-4 sm:border-t-0 sm:border-l-2 sm:pt-0 sm:pl-4">
            <ReferenceImagesUpload images={references} onChange={setReferences} maxImages={6} />
            <p className="mt-1 text-xs text-ink/45">
              Used only so the model can understand the intended style/mood —
              not copied literally into the result.
            </p>
          </div>
          <div>
            <AttachmentsUpload
              attachments={attachments}
              onChange={setAttachments}
              onInsertLabel={insertLabel}
              maxAttachments={6}
            />
          </div>
        </div>

        <button type="button" onClick={generate} disabled={busy} className="kal-btn-primary">
          {busy ? "Generating…" : "Generate image"}
        </button>
        {error && <p className="whitespace-pre-wrap text-xs font-semibold text-purple">{error}</p>}
      </div>

      {resultImage && (
        <div className="kal-card space-y-3">
          <span className="kal-label">Result</span>
          <div className="overflow-hidden rounded-xl border-2 border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultImage} alt="Generated result" className="w-full object-contain" />
          </div>
          <button
            type="button"
            onClick={() => downloadImage(resultImage, history.length)}
            className="kal-btn-secondary"
          >
            Download PNG
          </button>
        </div>
      )}

      {history.length > 1 && (
        <div className="kal-card space-y-3">
          <span className="kal-label">History (this session)</span>
          <div className="flex flex-wrap gap-3">
            {history.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setResultImage(h.imageDataUrl)}
                title={h.prompt}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-ink/15 hover:border-ink"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={h.imageDataUrl}
                  alt={`Generation ${history.length - i}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
