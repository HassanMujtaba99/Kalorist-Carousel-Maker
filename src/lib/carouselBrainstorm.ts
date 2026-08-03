import type {
  AppSettings,
  CtaSlideData,
  DayOnAPlateSlideData,
  FoodItem,
  PlateSection,
  Slide,
  ThisOrThatSlideData,
  TitleSlideData,
} from "./types";
import { newId } from "./carousel";
import { draftCopy } from "./copyProvider";
import { searchUsdaFood } from "./usdaClient";

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

type BrainstormFormat = "this-or-that" | "day-on-a-plate";

function buildCarouselBrainstormPrompt(
  topic: string,
  count: number,
  hasImages: boolean
): string {
  return `You are brainstorming content for a nutrition-education Instagram carousel post
aimed at a fitness/nutrition coaching audience. Voice: energetic, evidence-based,
no hashtags, no emoji, no quotation marks in your output.

Topic/niche: "${topic || (hasImages ? "infer it from the attached reference image(s)" : "a general nutrition tip for a broad audience")}"
${
  hasImages
    ? `Reference image(s) of an EARLIER post in this same carousel series ("Part 1") are
attached. Study them to infer: the topic/theme, the tone, and which of the two
FORMATs below they use. Brainstorm the NEXT installment ("Part 2") that
continues the same theme and uses the SAME format — but with entirely new
food picks and new copy. Do not reuse or describe any specific food, price,
or text actually visible in the reference image(s) — this must read as a
fresh follow-up post, not a copy of what's shown.`
    : ""
}

First decide the FORMAT for this post${hasImages ? " (matching the reference image(s) if attached)" : ""}:
- "this-or-that": head-to-head comparisons of two options per slide (e.g. Big Mac vs. grilled chicken sandwich)
- "day-on-a-plate": one slide showing several meals/snacks across a day (breakfast, lunch, dinner, snacks, etc.)
${hasImages ? "" : 'Default to "this-or-that" unless the topic clearly calls for a full day of meals.'}

Each food query below MUST be a real, specific, well-known food, restaurant
menu item, or packaged product (not a vague category) since it will be
looked up in the USDA FoodData Central database for its real calorie count —
do not invent numbers, only name real foods.

Reply with ONLY the fields below, one per line, in this exact "KEY: value" shape.
Do not add any preamble, explanation, sign-off, markdown formatting, bullet
points, asterisks, or code fences — the first character of your reply must
be "F" from "FORMAT:".

FORMAT: <this-or-that or day-on-a-plate>
HEADLINE: <cover slide headline, max 12 words>
CTA: <closing call-to-action line, max 8 words>

If FORMAT is this-or-that, follow with exactly ${count} of these blocks (COMPARISON_1 through COMPARISON_${count}):
COMPARISON_N_LEFT_QUERY: <a real, specific, searchable food or menu item name>
COMPARISON_N_LEFT_LABEL: <punchy 2-4 word label for this side>
COMPARISON_N_RIGHT_QUERY: <a real, specific, searchable food or menu item name>
COMPARISON_N_RIGHT_LABEL: <punchy 2-4 word label for this side>

If FORMAT is day-on-a-plate, instead follow with exactly ${count} of these blocks (SECTION_1 through SECTION_${count}):
SECTION_N_LABEL: <meal label, e.g. Breakfast>
SECTION_N_QUERY: <a real, specific, searchable food or menu item name for that meal>`;
}

interface BrainstormComparison {
  leftQuery: string;
  leftLabel: string;
  rightQuery: string;
  rightLabel: string;
}

interface BrainstormSection {
  label: string;
  query: string;
}

interface ParsedBrainstorm {
  format: BrainstormFormat;
  headline: string;
  cta: string;
  comparisons: BrainstormComparison[];
  sections: BrainstormSection[];
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

function parseCarouselBrainstorm(rawText: string, count: number): ParsedBrainstorm | null {
  const text = normalizeBrainstormText(rawText);
  const headline = extractField(text, "HEADLINE");
  const cta = extractField(text, "CTA");
  if (!headline || !cta) return null;

  const format: BrainstormFormat =
    extractField(text, "FORMAT")?.trim().toLowerCase() === "day-on-a-plate"
      ? "day-on-a-plate"
      : "this-or-that";

  if (format === "day-on-a-plate") {
    const sections: BrainstormSection[] = [];
    for (let i = 1; i <= count; i++) {
      const label = extractField(text, `SECTION_${i}_LABEL`);
      const query = extractField(text, `SECTION_${i}_QUERY`);
      if (!label || !query) continue;
      sections.push({ label, query });
    }
    if (sections.length === 0) return null;
    return { format, headline, cta, comparisons: [], sections };
  }

  const comparisons: BrainstormComparison[] = [];
  for (let i = 1; i <= count; i++) {
    const leftQuery = extractField(text, `COMPARISON_${i}_LEFT_QUERY`);
    const leftLabel = extractField(text, `COMPARISON_${i}_LEFT_LABEL`);
    const rightQuery = extractField(text, `COMPARISON_${i}_RIGHT_QUERY`);
    const rightLabel = extractField(text, `COMPARISON_${i}_RIGHT_LABEL`);
    if (!leftQuery || !leftLabel || !rightQuery || !rightLabel) continue;
    comparisons.push({ leftQuery, leftLabel, rightQuery, rightLabel });
  }
  if (comparisons.length === 0) return null;

  return { format, headline, cta, comparisons, sections: [] };
}

export interface BrainstormedCarousel {
  cover: Slide;
  content: Slide[];
  cta: Slide;
  /** Comparisons/sections where no side resolved to a real USDA calorie figure, so they have no food items yet. */
  unresolvedComparisons: string[];
}

/**
 * Brainstorms a full carousel's worth of content in one shot: a cover
 * headline, `count` "this or that" comparisons OR a "day on a plate" grid
 * (format inferred from the topic and, if attached, from reference images
 * treated as an earlier "Part 1" post in the same series), plus a closing
 * CTA. The AI only proposes *which* real foods to use (as search queries) —
 * every calorie number still comes from an actual USDA FoodData Central
 * lookup, never from the model itself.
 */
export async function brainstormCarousel(
  topic: string,
  images: string[],
  count: number,
  settings: AppSettings
): Promise<BrainstormedCarousel> {
  const prompt = buildCarouselBrainstormPrompt(topic, count, images.length > 0);
  const text = await draftCopy(prompt, settings, {
    images: images.length > 0 ? images : undefined,
    maxTokens: 400 + count * 200,
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
  const content: Slide[] = [];

  if (parsed.format === "day-on-a-plate") {
    const results = await Promise.all(
      parsed.sections.map((section) =>
        searchUsdaFood(section.query, settings.usdaApiKey).catch(() => [])
      )
    );
    const sections: PlateSection[] = parsed.sections.map((section, i) => {
      const food = pickResolvedFood(results[i]);
      if (!food) unresolvedComparisons.push(`${section.label}: ${section.query}`);
      return { id: newId("section"), label: section.label, items: food ? [food] : [] };
    });
    const data: DayOnAPlateSlideData = { kind: "day-on-a-plate", sections };
    content.push({ id: newId("slide"), data, status: "idle" });
  } else {
    for (const comparison of parsed.comparisons) {
      const [leftResults, rightResults] = await Promise.all([
        searchUsdaFood(comparison.leftQuery, settings.usdaApiKey).catch(() => []),
        searchUsdaFood(comparison.rightQuery, settings.usdaApiKey).catch(() => []),
      ]);

      const leftFood = pickResolvedFood(leftResults);
      const rightFood = pickResolvedFood(rightResults);

      if (!leftFood || !rightFood) {
        unresolvedComparisons.push(`${comparison.leftQuery} vs ${comparison.rightQuery}`);
      }

      const data: ThisOrThatSlideData = {
        kind: "this-or-that",
        leftLabel: comparison.leftLabel,
        leftItems: leftFood ? [leftFood] : [],
        rightLabel: comparison.rightLabel,
        rightItems: rightFood ? [rightFood] : [],
      };
      content.push({ id: newId("slide"), data, status: "idle" });
    }
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
  };
}
