"use client";

import type { FoodItem } from "@/lib/types";

interface Props {
  item: FoodItem;
  onRemove: () => void;
}

export function FoodChip({ item, onRemove }: Props) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs dark:border-white/10 dark:bg-white/10">
      <span className="max-w-[14rem] truncate">
        {item.brandName ? `${item.brandName} — ` : ""}
        {item.description}
      </span>
      <span className="font-semibold">{item.calories} cal</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.description}`}
        className="text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
      >
        ×
      </button>
    </span>
  );
}
