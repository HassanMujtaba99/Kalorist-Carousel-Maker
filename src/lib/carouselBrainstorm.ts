import type { AppSettings, CtaSlideData, Slide, ThisOrThatSlideData, TitleSlideData } from "./types";
import { newId } from "./carousel";
import { draftCopy } from "./copyProvider";
import { searchUsdaFood } from "./usdaClient";

function buildCarouselBrainstormPrompt(topic: string, count: number, hasImages: boolean): string {
  const comparisonFields = Array.from({ length: count })
    .map(
      (_, i) => `COMPARISON_${i + 1}_LEFT_QUERY: <a real, specific, searchable food or menu item name>
COMPARISON_${i + 1}_LEFT_LABEL: <punchy 2-4 word label for this side>
COMPARISON_${i + 1}_RIGHT_QUERY: <a real, specific, searchable food or menu item name>
COMPARISON_${i + 1}_RIGHT_LABEL: <punchy 2-4 word label for this side>`
    )
    .join("\n");

  return `You are brainstorming content for a nutrition-education Instagram carousel post
aimed at a fitness/nutrition coaching audience. Voice: energetic, evidence-based,
no hashtags, no emoji, no quotation marks in your output.

Topic/niche: "${topic || "a general nutrition tip for a broad audience"}"
${
  hasImages
    ? "Reference image(s) are attached — use them only as inspiration for tone, format, and the kind of comparisons shown. Do not copy any text visible in them verbatim."
    : ""
}

Brainstorm ${count} "this or that" food comparisons for the middle of the
carousel, plus a cover headline and a closing call-to-action. Each
comparison's LEFT/RIGHT query MUST be a real, specific, well-known food,
restaurant menu item, or packaged product (not a vague category) since it
will be looked up in the USDA FoodData Central database for its real
calorie count — do not invent numbers, only name real foods.

Reply in EXACTLY this format, one field per line, nothing else, no markdown:
HEADLINE: <cover slide headline, max 12 words>
CTA: <closing call-to-action line, max 8 words>
${comparisonFields}`;
}

interface BrainstormComparison {
  leftQuery: string;
  leftLabel: string;
  rightQuery: string;
  rightLabel: string;
}

interface ParsedBrainstorm {
  headline: string;
  cta: string;
  comparisons: BrainstormComparison[];
}

function extractField(text: string, key: string): string | null {
  const match = new RegExp(`^${key}:\\s*(.+)$`, "im").exec(text);
  return match ? match[1].trim() : null;
}

function parseCarouselBrainstorm(text: string, count: number): ParsedBrainstorm | null {
  const headline = extractField(text, "HEADLINE");
  const cta = extractField(text, "CTA");
  if (!headline || !cta) return null;

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

  return { headline, cta, comparisons };
}

export interface BrainstormedCarousel {
  cover: Slide;
  content: Slide[];
  cta: Slide;
  /** Comparisons where a USDA search came back empty, so the slide has no food items yet. */
  unresolvedComparisons: string[];
}

/**
 * Brainstorms a full carousel's worth of content in one shot: a cover
 * headline, `count` "this or that" food comparisons, and a closing CTA.
 * The AI only proposes *which* real foods to compare (as search queries) —
 * every calorie number still comes from an actual USDA FoodData Central
 * lookup per comparison, never from the model itself.
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
    maxTokens: 200 + count * 150,
  });

  const parsed = parseCarouselBrainstorm(text, count);
  if (!parsed) {
    throw new Error("Could not parse the brainstormed content — try again.");
  }

  const unresolvedComparisons: string[] = [];
  const content: Slide[] = [];

  for (const comparison of parsed.comparisons) {
    const [leftResults, rightResults] = await Promise.all([
      searchUsdaFood(comparison.leftQuery, settings.usdaApiKey).catch(() => []),
      searchUsdaFood(comparison.rightQuery, settings.usdaApiKey).catch(() => []),
    ]);

    if (leftResults.length === 0 || rightResults.length === 0) {
      unresolvedComparisons.push(`${comparison.leftQuery} vs ${comparison.rightQuery}`);
    }

    const data: ThisOrThatSlideData = {
      kind: "this-or-that",
      leftLabel: comparison.leftLabel,
      leftItems: leftResults[0] ? [leftResults[0]] : [],
      rightLabel: comparison.rightLabel,
      rightItems: rightResults[0] ? [rightResults[0]] : [],
    };
    content.push({ id: newId("slide"), data, status: "idle" });
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
