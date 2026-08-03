import type { FoodItem } from "./types";

export async function searchUsdaFood(query: string, apiKey: string): Promise<FoodItem[]> {
  const res = await fetch("/api/usda/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, apiKey }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `USDA search failed (${res.status})`);
  }
  return (json.foods ?? []) as FoodItem[];
}
