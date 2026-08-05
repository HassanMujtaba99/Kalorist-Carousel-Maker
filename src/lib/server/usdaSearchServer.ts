import { usdaResultToFoodItem, type UsdaFoodSearchResult } from "@/lib/nutrition";
import type { FoodItem } from "@/lib/types";

/** Server-context counterpart of src/lib/usdaClient.ts — same direct-to-USDA
 * logic as /api/usda/search, duplicated (not shared) to avoid any regression
 * risk to that already-working route. See draftCopyServer.ts for why. */
export async function searchUsdaFoodServer(query: string, apiKey: string): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    query,
    api_key: apiKey.trim() || "DEMO_KEY",
    pageSize: "15",
    dataType: "Branded,Foundation,SR Legacy,Survey (FNDDS)",
  });

  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`USDA FoodData Central returned ${res.status}. ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { foods?: UsdaFoodSearchResult[] };
  return (data.foods ?? []).map(usdaResultToFoodItem);
}
