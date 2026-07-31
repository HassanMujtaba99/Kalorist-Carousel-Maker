"use client";

import type { CarouselSummary } from "@/lib/carouselsClient";

interface Props {
  carousels: CarouselSummary[];
  activeId: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  onSave: () => void;
  onNew: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MyCarouselsPanel({
  carousels,
  activeId,
  saveStatus,
  saveError,
  onSave,
  onNew,
  onLoad,
  onDelete,
}: Props) {
  return (
    <div className="kal-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-ink">My Carousels</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onNew} className="kal-btn-ghost">
            + New
          </button>
          <button type="button" onClick={onSave} disabled={saveStatus === "saving"} className="kal-btn-primary">
            {saveStatus === "saving"
              ? "Saving…"
              : activeId
                ? "Save changes"
                : "Save to my account"}
          </button>
        </div>
      </div>

      {saveStatus === "saved" && (
        <p className="text-xs font-semibold text-ink/50">Saved.</p>
      )}
      {saveStatus === "error" && saveError && (
        <p className="text-xs font-semibold text-purple">{saveError}</p>
      )}

      {carousels.length === 0 ? (
        <p className="text-xs text-ink/45">
          Nothing saved yet — build something and click &quot;Save to my
          account&quot;.
        </p>
      ) : (
        <ul className="divide-y-2 divide-ink/10 overflow-hidden rounded-xl border-2 border-ink/15">
          {carousels.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <button
                type="button"
                onClick={() => onLoad(c.id)}
                className={`truncate text-left text-sm ${
                  c.id === activeId ? "font-bold text-purple" : "text-ink"
                }`}
              >
                {c.title || "Untitled Carousel"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="shrink-0 text-xs font-bold text-purple hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
