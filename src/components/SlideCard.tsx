"use client";

import type { Slide } from "@/lib/types";
import { slideKindLabel } from "@/lib/carousel";
import { SlideEditor } from "./SlideEditor";
import type { SlideData } from "@/lib/types";

interface Props {
  slide: Slide;
  index: number;
  total: number;
  usdaApiKey: string;
  onChangeData: (data: SlideData) => void;
  onGenerate: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function SlideCard({
  slide,
  index,
  total,
  usdaApiKey,
  onChangeData,
  onGenerate,
  onRemove,
  onMove,
}: Props) {
  return (
    <div className="grid gap-4 rounded-xl border border-black/10 bg-white p-4 dark:bg-neutral-900 dark:border-white/10 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">
              {index + 1}
            </span>
            <span className="text-sm font-medium">{slideKindLabel(slide.data.kind)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              className="rounded px-2 py-1 text-xs disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Move slide earlier"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
              className="rounded px-2 py-1 text-xs disabled:opacity-30 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Move slide later"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Remove
            </button>
          </div>
        </div>

        <SlideEditor slide={slide} usdaApiKey={usdaApiKey} onChange={onChangeData} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={slide.status === "generating"}
            className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {slide.status === "generating"
              ? "Generating…"
              : slide.imageDataUrl
                ? "Regenerate slide"
                : "Generate slide"}
          </button>
          {slide.status === "error" && (
            <span className="text-xs text-red-600">{slide.error}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="aspect-[4/5] w-full overflow-hidden rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
          {slide.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.imageDataUrl}
              alt={`Slide ${index + 1} preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-black/40 dark:text-white/40">
              {slide.status === "generating" ? "Generating…" : "No preview yet"}
            </div>
          )}
        </div>
        {slide.imageDataUrl && (
          <a
            href={slide.imageDataUrl}
            download={`slide-${index + 1}.png`}
            className="text-xs font-medium underline underline-offset-2"
          >
            Download PNG
          </a>
        )}
      </div>
    </div>
  );
}
