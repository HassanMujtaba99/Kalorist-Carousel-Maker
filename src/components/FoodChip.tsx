"use client";

import type { FoodItem } from "@/lib/types";

interface Props {
  item: FoodItem;
  onRemove: () => void;
}

export function FoodChip({ item, onRemove }: Props) {
  return (
    <span
      className="kal-pill"
      title={item.approximated ? "Approximate — closest generic match found, not the exact item" : undefined}
    >
      <span className="max-w-[14rem] truncate font-semibold">
        {item.approximated ? "≈ " : ""}
        {item.brandName ? `${item.brandName} — ` : ""}
        {item.description}
      </span>
      <span className="font-extrabold">{item.calories} cal</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.description}`}
        className="text-ink/50 hover:text-ink"
      >
        ×
      </button>
    </span>
  );
}
