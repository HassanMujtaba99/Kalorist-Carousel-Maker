"use client";

import type { AppSettings, Slide, SlideData } from "@/lib/types";
import { slideKindLabel } from "@/lib/carousel";
import { SlideEditor } from "./SlideEditor";

interface Props {
  slide: Slide;
  displayNumber: number;
  usdaApiKey: string;
  settings: AppSettings;
  onChangeData: (data: SlideData) => void;
  onGenerate: () => void;
  /** Cover and CTA slides are fixed in place and cannot be removed or reordered. */
  locked?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function SlideCard({
  slide,
  displayNumber,
  usdaApiKey,
  settings,
  onChangeData,
  onGenerate,
  locked = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: Props) {
  return (
    <div className="kal-card grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {displayNumber}
            </span>
            <span className="text-sm font-bold text-ink">
              {slideKindLabel(slide.data.kind)}
            </span>
          </div>
          {locked ? (
            <span className="kal-pill">Fixed</span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={onMoveUp}
                className="rounded-full px-2 py-1 text-xs font-bold disabled:opacity-30 hover:bg-lime/40"
                aria-label="Move slide earlier"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={onMoveDown}
                className="rounded-full px-2 py-1 text-xs font-bold disabled:opacity-30 hover:bg-lime/40"
                aria-label="Move slide later"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-full px-2 py-1 text-xs font-bold text-purple hover:bg-purple/10"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <SlideEditor
          slide={slide}
          usdaApiKey={usdaApiKey}
          settings={settings}
          onChange={onChangeData}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={slide.status === "generating"}
            className="kal-btn-primary"
          >
            {slide.status === "generating"
              ? "Generating…"
              : slide.imageDataUrl
                ? "Regenerate slide"
                : "Generate slide"}
          </button>
          {slide.status === "error" && (
            <span className="text-xs font-semibold text-purple">{slide.error}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border-2 border-ink bg-ink/5">
          {slide.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.imageDataUrl}
              alt={`Slide ${displayNumber} preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-ink/40">
              {slide.status === "generating" ? "Generating…" : "No preview yet"}
            </div>
          )}
        </div>
        {slide.imageDataUrl && (
          <a
            href={slide.imageDataUrl}
            download={`slide-${displayNumber}.png`}
            className="text-xs font-bold text-purple underline underline-offset-2"
          >
            Download PNG
          </a>
        )}
      </div>
    </div>
  );
}
