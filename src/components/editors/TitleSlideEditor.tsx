"use client";

import type { TitleSlideData } from "@/lib/types";

interface Props {
  data: TitleSlideData;
  onChange: (data: TitleSlideData) => void;
}

export function TitleSlideEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Headline</span>
        <textarea
          value={data.headline}
          onChange={(e) => onChange({ ...data, headline: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Subheadline (optional)</span>
        <input
          type="text"
          value={data.subheadline ?? ""}
          onChange={(e) => onChange({ ...data, subheadline: e.target.value })}
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Background scene</span>
        <textarea
          value={data.scenePrompt}
          onChange={(e) => onChange({ ...data, scenePrompt: e.target.value })}
          rows={2}
          placeholder="e.g. a smiling person in gym clothes standing in a bright kitchen"
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
        />
      </label>
    </div>
  );
}
