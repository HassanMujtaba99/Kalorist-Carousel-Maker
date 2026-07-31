"use client";

import type { CtaSlideData } from "@/lib/types";

interface Props {
  data: CtaSlideData;
  onChange: (data: CtaSlideData) => void;
}

export function CtaSlideEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">CTA message</span>
        <input
          type="text"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Background scene</span>
        <textarea
          value={data.scenePrompt}
          onChange={(e) => onChange({ ...data, scenePrompt: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
        />
      </label>
    </div>
  );
}
