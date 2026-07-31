"use client";

import { useState } from "react";
import { slideKindLabel } from "@/lib/carousel";
import type { SlideKind } from "@/lib/types";

interface Props {
  kinds: SlideKind[];
  onAdd: (kind: SlideKind) => void;
}

/**
 * The "+" control for adding a content slide, placed between the last
 * content slide and the fixed CTA slide. With a single content type it adds
 * directly; once more content types exist (step-by-step, etc.) it expands
 * into a picker.
 */
export function AddContentSlideButton({ kinds, onAdd }: Props) {
  const [open, setOpen] = useState(false);

  if (kinds.length === 0) return null;

  const handleClick = () => {
    if (kinds.length === 1) {
      onAdd(kinds[0]);
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Add content slide"
        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-lime text-xl font-extrabold text-ink shadow-[3px_3px_0_0_var(--color-ink)] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_5px_0_0_var(--color-ink)]"
      >
        +
      </button>
      {kinds.length === 1 ? (
        <span className="text-xs font-bold tracking-wide text-ink/50 uppercase">
          Add {slideKindLabel(kinds[0])} slide
        </span>
      ) : (
        <span className="text-xs font-bold tracking-wide text-ink/50 uppercase">
          Add content slide
        </span>
      )}
      {open && kinds.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                onAdd(kind);
                setOpen(false);
              }}
              className="kal-btn-ghost"
            >
              {slideKindLabel(kind)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
