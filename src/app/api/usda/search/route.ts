import { NextRequest, NextResponse } from "next/server";
import { usdaResultToFoodItem, type UsdaFoodSearchResult } from "@/lib/nutrition";

const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

export async function POST(req: NextRequest) {
  let body: { query?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing 'query'." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim() || "DEMO_KEY";

  const params = new URLSearchParams({
    query,
    api_key: apiKey,
    pageSize: "15",
    dataType: "Branded,Foundation,SR Legacy,Survey (FNDDS)",
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${USDA_SEARCH_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach USDA FoodData Central." },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: `USDA FoodData Central returned ${upstream.status}.`,
        detail: text.slice(0, 500),
      },
      { status: upstream.status === 429 ? 429 : 502 }
    );
  }

  const data = (await upstream.json()) as { foods?: UsdaFoodSearchResult[] };
  const foods = (data.foods ?? []).map(usdaResultToFoodItem);

  return NextResponse.json({ foods });
}
