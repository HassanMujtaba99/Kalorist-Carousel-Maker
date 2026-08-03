import type {
  AppSettings,
  CtaSlideData,
  DayOnAPlateSlideData,
  FoodItem,
  PlateSection,
  ProteinSwapSlideData,
  Slide,
  ThisOrThatSlideData,
  TitleSlideData,
} from "./types";
import { newId } from "./carousel";
import { draftCopy } from "./copyProvider";
import { searchUsdaFood } from "./usdaClient";

/** Cap on how many items the brainstorm will ask for per side of a
 * protein-swap slide — a real meal is a handful of components, not an
 * open-ended list, and this keeps the prompt/parsing bounded. */
const MAX_PROTEIN_SWAP_ITEMS_PER_SIDE = 4;

/**
 * Picks the first USDA search result that actually resolved to a real
 * calorie figure. `usdaResultToFoodItem` falls back to `calories: 0` when a
 * result has no usable label/food nutrient data — silently accepting that
 * as "the" match would put a fake 0-calorie fact on the slide, so those
 * results are skipped in favor of the next one that has real data.
 */
function pickResolvedFood(results: FoodItem[]): FoodItem | null {
  return results.find((item) => item.calories > 0) ?? null;
}

/** Cuts a query at its first descriptive clause (", ...", " with ...", " on
 * ...", " in ...", " (...") — those clauses hurt USDA's text search and a
 * shorter core name often matches where the full phrase doesn't. Returns
 * null if there's no clause to strip (nothing more to try). */
function simplifyFoodQuery(query: string): string | null {
  const cut = query.split(/,| with | on | in | \(/i)[0].trim();
  return cut.length > 0 && cut.toLowerCase() !== query.trim().toLowerCase() ? cut : null;
}

/** A USDA search that swallows its own errors — used for best-effort
 * fallback attempts where the primary attempt already told us whether USDA
 * itself is reachable, so a fallback-specific error shouldn't change the
 * outcome. */
async function trySearch(query: string, apiKey: string): Promise<FoodItem | null> {
  try {
    return pickResolvedFood(await searchUsdaFood(query, apiKey));
  } catch {
    return null;
  }
}

interface FoodResolution {
  food: FoodItem | null;
  /** Set when the USDA search itself failed (network/rate-limit/bad key) —
   * distinct from a search that succeeded but had no usable match, so the
   * two failure modes aren't reported to the user as the same thing. */
  error: string | null;
}

/**
 * Resolves one food query to a real USDA-backed FoodItem. Tries, in order:
 * the exact query, a clause-simplified version of it, then — if provided —
 * a generic equivalent (e.g. "cheeseburger" for "McDonald's Cheeseburger")
 * and a simplified version of that. A match found via the generic fallback
 * is flagged `approximated` so the UI can be upfront that it's a close
 * stand-in, not the exact requested item — the number itself is still a
 * real, verified USDA figure the whole way through.
 */
async function resolveFood(
  query: string,
  genericQuery: string | null,
  apiKey: string
): Promise<FoodResolution> {
  let primaryResults: FoodItem[];
  try {
    primaryResults = await searchUsdaFood(query, apiKey);
  } catch (e) {
    return { food: null, error: e instanceof Error ? e.message : "USDA search failed" };
  }

  const direct = pickResolvedFood(primaryResults);
  if (direct) return { food: direct, error: null };

  const simplified = simplifyFoodQuery(query);
  if (simplified) {
    const food = await trySearch(simplified, apiKey);
    if (food) return { food, error: null };
  }

  const generic = genericQuery?.trim();
  if (generic && generic.toLowerCase() !== query.trim().toLowerCase()) {
    const food = await trySearch(generic, apiKey);
    if (food) return { food: { ...food, approximated: true }, error: null };

    const simplifiedGeneric = simplifyFoodQuery(generic);
    if (simplifiedGeneric) {
      const fallbackFood = await trySearch(simplifiedGeneric, apiKey);
      if (fallbackFood) return { food: { ...fallbackFood, approximated: true }, error: null };
    }
  }

  return { food: null, error: null };
}

type BrainstormFormat = "this-or-that" | "day-on-a-plate" | "protein-swap";

function buildCarouselBrainstormPrompt(
  topic: string,
  count: number,
  hasImages: boolean,
  region: string,
  city: string
): string {
  const hasRegion = region.trim().length > 0;
  const hasCity = hasRegion && city.trim().length > 0;
  const place = hasCity ? `${city.trim()}, ${region.trim()}` : region.trim();
  return `You are brainstorming content for a nutrition-education Instagram carousel post
aimed at a fitness/nutrition coaching audience. Voice: energetic, evidence-based,
no hashtags, no emoji, no quotation marks in your output.

Topic/niche: "${topic || (hasImages ? "infer it from the attached reference image(s)" : "a general nutrition tip for a broad audience")}"
Target audience location: ${hasRegion ? place : "global — no specific region, use widely recognizable examples"}
${
  hasRegion
    ? `CRITICAL: use food brands, restaurant chains, and dishes that are LOCAL to
${place} and that someone who actually lives there would immediately
recognize by name from everyday life — the specific local chains and
traditional/regional dishes people there actually eat and talk about, not
just any brand that happens to have a location there. Do NOT default to
multinational chains (McDonald's, KFC, Subway, Domino's, Starbucks, Pizza
Hut, etc.) just because they're the easiest to think of or operate
worldwide — only reach for one of those if there is genuinely no well-known
local equivalent for that specific comparison. When in doubt, prioritize a
local-only chain or a traditional dish over an international one.`
    : ""
}
${
  hasImages
    ? `Reference image(s) of an EARLIER post in this same carousel series ("Part 1") are
attached. Study them to infer: the topic/theme, the tone, and which of the
FORMATs below they use. Brainstorm the NEXT installment ("Part 2") that
continues the same theme and uses the SAME format — but with entirely new
food picks and new copy. Do not reuse or describe any specific food, price,
or text actually visible in the reference image(s) — this must read as a
fresh follow-up post, not a copy of what's shown.`
    : ""
}

First decide the FORMAT for this post${hasImages ? " (matching the reference image(s) if attached)" : ""}:
- "this-or-that": head-to-head comparisons of two options per slide, ideally two competing real restaurant/brand items against each other
- "day-on-a-plate": one slide showing several meals/snacks across a day (breakfast, lunch, dinner, snacks, etc.)
- "protein-swap": one slide showing the SAME kind of meal two ways — a lower-protein version and a higher-protein version, each a short list of real foods — to show how swapping in protein-rich items upgrades a familiar plate
${hasImages ? "" : 'Default to "this-or-that" unless the topic clearly calls for a full day of meals or a before/after protein upgrade.'}

Each food QUERY below should name a REAL restaurant/brand's actual menu item
by name whenever one exists — e.g. "<Brand> <Product>" style naming, the
same way a customer would order it${
    hasRegion ? ` — a real local or international brand's item that
actually exists in ${place}` : ""
  }. Do NOT describe it generically ("a fried chicken sandwich", "a spiced
rice dish") when a specific real brand/product name is available — name the
brand. Only fall back to a plain generic description when there's genuinely
no specific branded product to point to — e.g. an unbranded home-cooked or
traditional dish with no single restaurant associated with it. Either way,
keep it SHORT (2-5 words) and do NOT add descriptive clauses like "with
brown rice, black beans, and salsa" or "on whole wheat" — those hurt the
database search.

The QUERY does not need to be something USDA's database will find on its
own — that's what the GENERIC field below is for. Never water down or
genericize the QUERY itself just to make it more searchable.

Every QUERY must be paired with a GENERIC fallback: a plain, widely-known
equivalent food (no brand name, no region-specific name) that USDA's
US-centric database is likely to have, used automatically if the specific
branded item isn't found — e.g. GENERIC "cheeseburger" for QUERY
"McDonald's Cheeseburger", or GENERIC "fried chicken sandwich" for a local
chain's fried chicken burger, or GENERIC "rice and lentils" for a regional
dish the database may not carry by name. It will be looked up in the USDA
FoodData Central database for its real calorie count — do not invent
numbers, only name real foods.

Each LABEL should also name the real brand/product from its QUERY (not a
generic description like "Spicy Chicken Deal") so the label and the photo
it drives both point at something the audience actually recognizes.

Reply with ONLY the fields below, one per line, in this exact "KEY: value" shape.
Do not add any preamble, explanation, sign-off, markdown formatting, bullet
points, asterisks, or code fences — the first character of your reply must
be "F" from "FORMAT:".

FORMAT: <this-or-that, day-on-a-plate, or protein-swap>
HEADLINE: <cover slide headline, max 12 words>
CTA: <closing call-to-action line, max 8 words>

If FORMAT is this-or-that, follow with exactly ${count} of these blocks (COMPARISON_1 through COMPARISON_${count}):
COMPARISON_N_LEFT_QUERY: <the real, specific food/menu item name, brand included if one applies>
COMPARISON_N_LEFT_GENERIC: <plain generic fallback name for that food>
COMPARISON_N_LEFT_LABEL: <punchy 2-4 word label naming the same brand/product as the QUERY>
COMPARISON_N_RIGHT_QUERY: <the real, specific food/menu item name, brand included if one applies>
COMPARISON_N_RIGHT_GENERIC: <plain generic fallback name for that food>
COMPARISON_N_RIGHT_LABEL: <punchy 2-4 word label naming the same brand/product as the QUERY>

If FORMAT is day-on-a-plate, instead follow with exactly ${count} of these blocks (SECTION_1 through SECTION_${count}):
SECTION_N_LABEL: <meal label, e.g. Breakfast>
SECTION_N_QUERY: <the real, specific food/menu item name for that meal, brand included if one applies>
SECTION_N_GENERIC: <plain generic fallback name for that food>

If FORMAT is protein-swap, instead follow with:
PROTEIN_SWAP_HEADLINE: <a "POV: ..." style headline specific to this slide, max 12 words>
PROTEIN_SWAP_LEFT_LABEL: <short label for the lower-protein version, e.g. "Less protein">
PROTEIN_SWAP_LEFT_ITEM_1_QUERY: <real food/menu item name>
PROTEIN_SWAP_LEFT_ITEM_1_GENERIC: <plain generic fallback name for that food>
(repeat PROTEIN_SWAP_LEFT_ITEM_N_QUERY / _GENERIC for 2 to ${MAX_PROTEIN_SWAP_ITEMS_PER_SIDE} items total that together form one complete lower-protein meal)
PROTEIN_SWAP_RIGHT_LABEL: <short label for the higher-protein version, e.g. "More protein">
PROTEIN_SWAP_RIGHT_ITEM_1_QUERY: <real food/menu item name>
PROTEIN_SWAP_RIGHT_ITEM_1_GENERIC: <plain generic fallback name for that food>
(repeat PROTEIN_SWAP_RIGHT_ITEM_N_QUERY / _GENERIC for 2 to ${MAX_PROTEIN_SWAP_ITEMS_PER_SIDE} items total that together form one complete higher-protein meal)
PROTEIN_SWAP_RECOMMENDED: <left or right — whichever side has meaningfully more protein for a similar or lower calorie count>
PROTEIN_SWAP_TAKEAWAY: <one short punchy insight line, max 10 words>`;
}

interface BrainstormComparison {
  leftQuery: string;
  leftGeneric: string | null;
  leftLabel: string;
  rightQuery: string;
  rightGeneric: string | null;
  rightLabel: string;
}

interface BrainstormSection {
  label: string;
  query: string;
  generic: string | null;
}

interface BrainstormFoodQuery {
  query: string;
  generic: string | null;
}

interface BrainstormProteinSwap {
  headline: string;
  leftLabel: string;
  leftItems: BrainstormFoodQuery[];
  rightLabel: string;
  rightItems: BrainstormFoodQuery[];
  recommendedSide: "left" | "right";
  takeaway: string;
}

interface ParsedBrainstorm {
  format: BrainstormFormat;
  headline: string;
  cta: string;
  comparisons: BrainstormComparison[];
  sections: BrainstormSection[];
  proteinSwap: BrainstormProteinSwap | null;
}

/** Strips common markdown noise models add despite being told not to (code
 * fences, bullet markers, bold/backtick-wrapped keys) before line-matching. */
function normalizeBrainstormText(text: string): string {
  return text
    .replace(/```[a-z]*\n?/gi, "")
    .split("\n")
    .map((line) => line.replace(/^[\s>*-]+/, "").trim())
    .join("\n");
}

function extractField(text: string, key: string): string | null {
  const match = new RegExp(`^\\**${key}\\**\\s*:\\s*(.+)$`, "im").exec(text);
  if (!match) return null;
  return match[1].trim().replace(/\*+$/, "").replace(/^["'`]|["'`]$/g, "").trim();
}

function extractFoodQueryList(text: string, prefix: string): BrainstormFoodQuery[] {
  const items: BrainstormFoodQuery[] = [];
  for (let i = 1; i <= MAX_PROTEIN_SWAP_ITEMS_PER_SIDE; i++) {
    const query = extractField(text, `${prefix}${i}_QUERY`);
    if (!query) break;
    const generic = extractField(text, `${prefix}${i}_GENERIC`);
    items.push({ query, generic });
  }
  return items;
}

function parseCarouselBrainstorm(rawText: string, count: number): ParsedBrainstorm | null {
  const text = normalizeBrainstormText(rawText);
  const headline = extractField(text, "HEADLINE");
  const cta = extractField(text, "CTA");
  if (!headline || !cta) return null;

  const formatRaw = extractField(text, "FORMAT")?.trim().toLowerCase();
  const format: BrainstormFormat =
    formatRaw === "day-on-a-plate"
      ? "day-on-a-plate"
      : formatRaw === "protein-swap"
        ? "protein-swap"
        : "this-or-that";

  if (format === "protein-swap") {
    const swapHeadline = extractField(text, "PROTEIN_SWAP_HEADLINE");
    const leftLabel = extractField(text, "PROTEIN_SWAP_LEFT_LABEL");
    const rightLabel = extractField(text, "PROTEIN_SWAP_RIGHT_LABEL");
    const takeaway = extractField(text, "PROTEIN_SWAP_TAKEAWAY");
    const recommendedRaw = extractField(text, "PROTEIN_SWAP_RECOMMENDED")?.trim().toLowerCase();
    const leftItems = extractFoodQueryList(text, "PROTEIN_SWAP_LEFT_ITEM_");
    const rightItems = extractFoodQueryList(text, "PROTEIN_SWAP_RIGHT_ITEM_");

    if (
      !swapHeadline ||
      !leftLabel ||
      !rightLabel ||
      !takeaway ||
      leftItems.length === 0 ||
      rightItems.length === 0
    ) {
      return null;
    }

    const proteinSwap: BrainstormProteinSwap = {
      headline: swapHeadline,
      leftLabel,
      leftItems,
      rightLabel,
      rightItems,
      recommendedSide: recommendedRaw === "left" ? "left" : "right",
      takeaway,
    };
    return { format, headline, cta, comparisons: [], sections: [], proteinSwap };
  }

  if (format === "day-on-a-plate") {
    const sections: BrainstormSection[] = [];
    for (let i = 1; i <= count; i++) {
      const label = extractField(text, `SECTION_${i}_LABEL`);
      const query = extractField(text, `SECTION_${i}_QUERY`);
      const generic = extractField(text, `SECTION_${i}_GENERIC`);
      if (!label || !query) continue;
      sections.push({ label, query, generic });
    }
    if (sections.length === 0) return null;
    return { format, headline, cta, comparisons: [], sections, proteinSwap: null };
  }

  const comparisons: BrainstormComparison[] = [];
  for (let i = 1; i <= count; i++) {
    const leftQuery = extractField(text, `COMPARISON_${i}_LEFT_QUERY`);
    const leftGeneric = extractField(text, `COMPARISON_${i}_LEFT_GENERIC`);
    const leftLabel = extractField(text, `COMPARISON_${i}_LEFT_LABEL`);
    const rightQuery = extractField(text, `COMPARISON_${i}_RIGHT_QUERY`);
    const rightGeneric = extractField(text, `COMPARISON_${i}_RIGHT_GENERIC`);
    const rightLabel = extractField(text, `COMPARISON_${i}_RIGHT_LABEL`);
    if (!leftQuery || !leftLabel || !rightQuery || !rightLabel) continue;
    comparisons.push({ leftQuery, leftGeneric, leftLabel, rightQuery, rightGeneric, rightLabel });
  }
  if (comparisons.length === 0) return null;

  return { format, headline, cta, comparisons, sections: [], proteinSwap: null };
}

export interface BrainstormedCarousel {
  cover: Slide;
  content: Slide[];
  cta: Slide;
  /** Comparisons/sections where USDA search succeeded but had no usable match, so they have no food items yet. */
  unresolvedComparisons: string[];
  /** How many individual food lookups failed because the USDA search itself errored (network/rate-limit/bad key) — distinct from a genuine no-match. */
  usdaErrorCount: number;
  /** One representative USDA error message, for surfacing what actually went wrong. */
  usdaErrorSample: string | null;
  /** Specific foods that weren't found and were substituted with a generic equivalent instead ("McDonald's Cheeseburger → cheeseburger"). */
  approximatedItems: string[];
}

/**
 * Brainstorms a full carousel's worth of content in one shot: a cover
 * headline, a middle content slide in one of three formats — `count` "this
 * or that" comparisons, a "day on a plate" grid, or a "protein swap"
 * before/after meal comparison — (format inferred from the topic and, if
 * attached, from reference images treated as an earlier "Part 1" post in
 * the same series), plus a closing CTA. The AI only proposes *which* real
 * foods to use (as search queries) — every calorie/protein number still
 * comes from an actual USDA FoodData Central lookup, never from the model
 * itself. If a specific brand/item isn't in USDA's database, a generic
 * equivalent it also proposed is used instead (flagged as approximated),
 * rather than leaving the slide empty.
 */
export async function brainstormCarousel(
  topic: string,
  images: string[],
  count: number,
  region: string,
  city: string,
  settings: AppSettings
): Promise<BrainstormedCarousel> {
  const prompt = buildCarouselBrainstormPrompt(topic, count, images.length > 0, region, city);
  const text = await draftCopy(prompt, settings, {
    images: images.length > 0 ? images : undefined,
    maxTokens: 700 + count * 260,
  });

  const parsed = parseCarouselBrainstorm(text, count);
  if (!parsed) {
    const snippet = text.trim().slice(0, 500);
    throw new Error(
      `Could not parse the brainstormed content. The model replied:\n\n${snippet}${
        text.trim().length > 500 ? "…" : ""
      }`
    );
  }

  const unresolvedComparisons: string[] = [];
  const usdaErrors: string[] = [];
  const approximatedItems: string[] = [];
  const content: Slide[] = [];
  let totalQueries = 0;

  const track = (query: string, generic: string | null, res: FoodResolution) => {
    if (res.food?.approximated && generic) approximatedItems.push(`${query} → ${generic}`);
  };

  if (parsed.format === "protein-swap" && parsed.proteinSwap) {
    const swap = parsed.proteinSwap;
    totalQueries = swap.leftItems.length + swap.rightItems.length;

    const resolveSide = async (items: BrainstormFoodQuery[], sideLabel: string) => {
      const resolutions = await Promise.all(
        items.map((item) => resolveFood(item.query, item.generic, settings.usdaApiKey))
      );
      const foods: FoodItem[] = [];
      resolutions.forEach((res, i) => {
        track(items[i].query, items[i].generic, res);
        if (res.error) {
          usdaErrors.push(res.error);
        } else if (!res.food) {
          unresolvedComparisons.push(`${sideLabel}: ${items[i].query}`);
        }
        if (res.food) foods.push(res.food);
      });
      return foods;
    };

    const [leftFoods, rightFoods] = await Promise.all([
      resolveSide(swap.leftItems, swap.leftLabel),
      resolveSide(swap.rightItems, swap.rightLabel),
    ]);

    const data: ProteinSwapSlideData = {
      kind: "protein-swap",
      headline: swap.headline,
      leftLabel: swap.leftLabel,
      leftItems: leftFoods,
      rightLabel: swap.rightLabel,
      rightItems: rightFoods,
      recommendedSide: swap.recommendedSide,
      takeaway: swap.takeaway,
    };
    content.push({ id: newId("slide"), data, status: "idle" });
  } else if (parsed.format === "day-on-a-plate") {
    totalQueries = parsed.sections.length;
    const resolutions = await Promise.all(
      parsed.sections.map((section) =>
        resolveFood(section.query, section.generic, settings.usdaApiKey)
      )
    );
    const sections: PlateSection[] = parsed.sections.map((section, i) => {
      const { food, error } = resolutions[i];
      track(section.query, section.generic, resolutions[i]);
      if (error) {
        usdaErrors.push(error);
      } else if (!food) {
        unresolvedComparisons.push(`${section.label}: ${section.query}`);
      }
      return { id: newId("section"), label: section.label, items: food ? [food] : [] };
    });
    const data: DayOnAPlateSlideData = { kind: "day-on-a-plate", sections };
    content.push({ id: newId("slide"), data, status: "idle" });
  } else {
    totalQueries = parsed.comparisons.length * 2;
    for (const comparison of parsed.comparisons) {
      const [leftRes, rightRes] = await Promise.all([
        resolveFood(comparison.leftQuery, comparison.leftGeneric, settings.usdaApiKey),
        resolveFood(comparison.rightQuery, comparison.rightGeneric, settings.usdaApiKey),
      ]);
      track(comparison.leftQuery, comparison.leftGeneric, leftRes);
      track(comparison.rightQuery, comparison.rightGeneric, rightRes);

      if (leftRes.error) usdaErrors.push(leftRes.error);
      if (rightRes.error) usdaErrors.push(rightRes.error);
      if (!leftRes.error && !rightRes.error && (!leftRes.food || !rightRes.food)) {
        unresolvedComparisons.push(`${comparison.leftQuery} vs ${comparison.rightQuery}`);
      }

      const data: ThisOrThatSlideData = {
        kind: "this-or-that",
        leftLabel: comparison.leftLabel,
        leftItems: leftRes.food ? [leftRes.food] : [],
        rightLabel: comparison.rightLabel,
        rightItems: rightRes.food ? [rightRes.food] : [],
      };
      content.push({ id: newId("slide"), data, status: "idle" });
    }
  }

  if (usdaErrors.length > 0 && usdaErrors.length === totalQueries) {
    throw new Error(
      `USDA FoodData Central couldn't be reached for any of the ${totalQueries} food lookups (${usdaErrors[0]}). This usually means the shared demo USDA key has hit its rate limit — add your own free key at api.data.gov/signup in Settings and try again.`
    );
  }

  const coverData: TitleSlideData = {
    kind: "title",
    headline: parsed.headline,
    scenePrompt: "a smiling person in smart casual clothing standing outdoors at golden hour",
  };
  const ctaData: CtaSlideData = {
    kind: "cta",
    message: parsed.cta,
    scenePrompt: "a smiling person laughing outdoors at golden hour, same styling as the cover slide",
  };

  return {
    cover: { id: newId("slide"), data: coverData, status: "idle" },
    content,
    cta: { id: newId("slide"), data: ctaData, status: "idle" },
    unresolvedComparisons,
    usdaErrorCount: usdaErrors.length,
    usdaErrorSample: usdaErrors[0] ?? null,
    approximatedItems,
  };
}
