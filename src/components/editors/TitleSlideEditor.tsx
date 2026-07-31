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
        <span className="kal-label">Headline</span>
        <textarea
          value={data.headline}
          onChange={(e) => onChange({ ...data, headline: e.target.value })}
          rows={2}
          className="kal-input"
        />
      </label>
      <label className="block text-sm">
        <span className="kal-label">Subheadline (optional)</span>
        <input
          type="text"
          value={data.subheadline ?? ""}
          onChange={(e) => onChange({ ...data, subheadline: e.target.value })}
          className="kal-input"
        />
      </label>
      <label className="block text-sm">
        <span className="kal-label">Background scene</span>
        <textarea
          value={data.scenePrompt}
          onChange={(e) => onChange({ ...data, scenePrompt: e.target.value })}
          rows={2}
          placeholder="e.g. a smiling person in gym clothes standing in a bright kitchen"
          className="kal-input"
        />
      </label>
    </div>
  );
}
