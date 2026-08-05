"use client";

import { useRef, useState } from "react";
import type { AnnotatedItem } from "@/lib/studioTypes";
import { newId } from "@/lib/carousel";

interface Props {
  image: string;
  items: AnnotatedItem[];
  onChange: (items: AnnotatedItem[]) => void;
}

interface DragState {
  id: string;
  kind: "move" | "resize";
  startX: number;
  startY: number;
  origItem: AnnotatedItem;
}

const MIN_SIZE = 4;

/**
 * Overlays best-effort AI-detected item boxes on a reference image, each
 * draggable (reposition), resizable (bottom-right handle), removable, and
 * renamable via the input list below — since Gemini's bounding boxes are a
 * starting point, not a guaranteed-accurate final answer. A user can also
 * add a box for anything the detection pass missed entirely.
 */
export function ImageItemAnnotator({ image, items, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const updateItem = (id: string, patch: Partial<AnnotatedItem>) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const removeItem = (id: string) => onChange(items.filter((it) => it.id !== id));
  const addItem = () => {
    onChange([
      ...items,
      { id: newId("item"), label: "New item", x: 35, y: 35, width: 30, height: 30 },
    ]);
  };

  const startDrag = (item: AnnotatedItem, kind: "move" | "resize") => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ id: item.id, kind, startX: e.clientX, startY: e.clientY, origItem: item });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;

    if (drag.kind === "move") {
      const x = Math.max(0, Math.min(100 - drag.origItem.width, drag.origItem.x + dxPct));
      const y = Math.max(0, Math.min(100 - drag.origItem.height, drag.origItem.y + dyPct));
      updateItem(drag.id, { x, y });
    } else {
      const width = Math.max(
        MIN_SIZE,
        Math.min(100 - drag.origItem.x, drag.origItem.width + dxPct)
      );
      const height = Math.max(
        MIN_SIZE,
        Math.min(100 - drag.origItem.y, drag.origItem.height + dyPct)
      );
      updateItem(drag.id, { width, height });
    }
  };

  const endDrag = () => setDrag(null);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full touch-none overflow-hidden rounded-xl border-2 border-ink select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Reference" className="block w-full" draggable={false} />
        {items.map((item, i) => (
          <div
            key={item.id}
            className="absolute cursor-move border-2 border-lime bg-lime/20"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.width}%`,
              height: `${item.height}%`,
            }}
            onPointerDown={startDrag(item, "move")}
          >
            <span className="absolute -top-6 left-0 max-w-[10rem] truncate rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
              {i + 1}. {item.label || "…"}
            </span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.label}`}
              className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-bl bg-purple text-[10px] font-bold text-white"
            >
              ×
            </button>
            <div
              onPointerDown={startDrag(item, "resize")}
              className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-lime shadow-[0_0_0_1px_var(--color-ink)]"
            />
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-xs font-semibold text-ink/50">
          No items detected — add one below, or this reference will only inform overall style.
        </p>
      )}

      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-xs font-bold text-ink/40">{i + 1}.</span>
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem(item.id, { label: e.target.value })}
              className="kal-input !py-1 !text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.label}`}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-purple hover:bg-purple/10"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addItem} className="kal-btn-ghost text-xs">
        + Add missed item
      </button>
    </div>
  );
}
