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
        <span className="kal-label">CTA message</span>
        <input
          type="text"
          value={data.message}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          className="kal-input"
        />
      </label>
      <label className="block text-sm">
        <span className="kal-label">Background scene</span>
        <textarea
          value={data.scenePrompt}
          onChange={(e) => onChange({ ...data, scenePrompt: e.target.value })}
          rows={2}
          className="kal-input"
        />
      </label>
    </div>
  );
}
