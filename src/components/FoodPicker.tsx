"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodItem } from "@/lib/types";

interface Props {
  usdaApiKey: string;
  onAdd: (item: FoodItem) => void;
}

export function FoodPicker({ usdaApiKey, onAdd }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/usda/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, apiKey: usdaApiKey }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Search failed");
        setResults(json.foods ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, usdaApiKey]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (!value.trim()) {
            setResults([]);
            setError(null);
          }
        }}
        placeholder="Search USDA FoodData Central (e.g. McDonald's Cheeseburger)"
        className="kal-input"
      />
      {loading && <p className="text-xs font-semibold text-ink/50">Searching…</p>}
      {error && <p className="text-xs font-semibold text-purple">{error}</p>}
      {results.length > 0 && (
        <ul className="max-h-56 divide-y-2 divide-ink/10 overflow-y-auto rounded-xl border-2 border-ink/15">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(food);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-lime/30"
              >
                <span className="truncate">
                  {food.brandName ? `${food.brandName} — ` : ""}
                  {food.description}
                  {food.servingDescription ? (
                    <span className="text-ink/40"> ({food.servingDescription})</span>
                  ) : null}
                </span>
                <span className="shrink-0 rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-xs font-bold text-ink">
                  {food.calories || "?"} cal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
