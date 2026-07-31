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
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:bg-neutral-800 dark:border-white/15"
      />
      {loading && <p className="text-xs text-black/50 dark:text-white/50">Searching…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {results.length > 0 && (
        <ul className="max-h-56 divide-y divide-black/5 overflow-y-auto rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(food);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="truncate">
                  {food.brandName ? `${food.brandName} — ` : ""}
                  {food.description}
                  {food.servingDescription ? (
                    <span className="text-black/40 dark:text-white/40">
                      {" "}
                      ({food.servingDescription})
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-white dark:bg-white dark:text-black">
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
