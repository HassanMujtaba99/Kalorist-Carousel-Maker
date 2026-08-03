"use client";

import type { BadgeTemplate } from "@/lib/types";
import { BADGE_TEMPLATES } from "@/lib/promptBuilder";

interface Props {
  value: BadgeTemplate;
  onChange: (template: BadgeTemplate) => void;
}

/** Picker for the brand name tag's visual template — giving the image model
 * one fixed, precise shape per template (instead of always reinterpreting a
 * vague "logo badge" description) is what makes it render consistently
 * across every slide in a carousel. */
export function BadgeTemplatePicker({ value, onChange }: Props) {
  return (
    <div>
      <span className="kal-label">Name tag style</span>
      <div className="flex flex-wrap gap-2">
        {BADGE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            title={t.preview}
            className={value === t.id ? "kal-pill" : "kal-btn-ghost"}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
