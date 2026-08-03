import type { CarouselBrand } from "./types";
import { STYLE_GUIDE, attribution, brandBadge, foodLine } from "./promptBuilder";
import { sumCalories, sumProtein } from "./nutrition";
import type { FoodWithPhoto, PlateSectionRecreateInput } from "./recreateTypes";

/**
 * Prompt builders for the "recreate" page: instead of asking Gemini to
 * imagine a scene from scratch (like promptBuilder.ts), these tell it to
 * use the user's own uploaded photo(s) as-is and only compose the same
 * badge/pill/typography overlays on top. Callers must build the `images`
 * array passed to /api/gemini/generate in the exact order described in
 * each prompt (documented per function below) — Gemini has no other way
 * to know which attached image is which.
 */

export function buildPhotoCaptionRecreatePrompt(
  caption: string,
  brand: CarouselBrand,
  hasPhoto: boolean
): string {
  const photoInstruction = hasPhoto
    ? `A reference photo is attached. Use it EXACTLY as the background image of
the slide — do not regenerate, replace, or meaningfully alter the photo
itself (light crop/contrast touch-ups for legibility and portrait 4:5
framing are fine).`
    : `No reference photo was attached — generate a candid, high-quality
lifestyle photograph as the background, suitable for a nutrition-coaching
Instagram post.`;

  return `Recreate this reference layout as one finished, ready-to-post Instagram
carousel slide, portrait 4:5 aspect ratio.

${photoInstruction}

Overlay near the top of the image: a solid black rounded rectangle badge
(like a speech-bubble callout with a small pointer tail) containing bold
white text, centered, that reads EXACTLY:
"${caption}"

${brandBadge(brand)}

${STYLE_GUIDE}
Spell every word in the caption correctly and exactly as written above.`;
}

/** Images array order for this prompt: [leftPhoto?, rightPhoto?] — include only the ones that exist, in that order. */
export function buildThisOrThatRecreatePrompt(
  left: FoodWithPhoto,
  right: FoodWithPhoto,
  brand: CarouselBrand
): string {
  const leftCals = sumCalories(left.items);
  const rightCals = sumCalories(right.items);
  const leftDesc = left.items.map(foodLine).join("; ") || left.label;
  const rightDesc = right.items.map(foodLine).join("; ") || right.label;

  const attachedOrder = [left.photo ? "LEFT" : null, right.photo ? "RIGHT" : null].filter(Boolean);

  const leftPhotoInstruction = left.photo
    ? "A reference photo for this column is attached — use it EXACTLY as the food image, do not regenerate it."
    : `Generate appetising product photography of: ${leftDesc}`;
  const rightPhotoInstruction = right.photo
    ? "A reference photo for this column is attached — use it EXACTLY as the food image, do not regenerate it."
    : `Generate appetising product photography of: ${rightDesc}`;

  return `Recreate this reference layout as one finished, ready-to-post Instagram
carousel slide, portrait 4:5 aspect ratio, light blue/white flat background
(#e8eef7 style), in the visual language of an "evidence based nutrition"
comparison graphic.
${
  attachedOrder.length > 0
    ? `\n${attachedOrder.length} reference photo(s) are attached, in this order: ${attachedOrder.join(", then ")}.`
    : ""
}

${brandBadge(brand)}

Below the badge, large bold black condensed uppercase headline text, centered,
reading exactly: "THIS OR THAT"

Below the headline, a two-column layout:

LEFT column — labeled "${left.label}" in bold text below the photo:
  ${leftPhotoInstruction}
  Below the photo, a black rounded pill badge with bold white text reading
  exactly: "${leftCals} CALS"

RIGHT column — labeled "${right.label}" in bold text below the photo(s):
  ${rightPhotoInstruction}
  Below the photo(s), a black rounded pill badge with bold white text reading
  exactly: "${rightCals} CALS"

${attribution()}
Left total: ${leftCals} kcal. Right total: ${rightCals} kcal. These are the
only numbers allowed to appear on the slide.

${STYLE_GUIDE}`;
}

/** Images array order for this prompt: sections in order, skipping any with no photo. */
export function buildDayOnAPlateRecreatePrompt(
  sections: PlateSectionRecreateInput[],
  brand: CarouselBrand
): string {
  const allItems = sections.flatMap((s) => s.items);
  const totalCals = sumCalories(allItems);
  const totalProtein = sumProtein(allItems);
  const photoCount = sections.filter((s) => s.photo).length;

  const sectionLines = sections
    .map((section, i) => {
      const desc = section.items.map(foodLine).join("; ") || section.label;
      const instruction = section.photo
        ? "a reference photo for this section is attached — use it exactly as provided, do not regenerate it"
        : `generate appetising product photography of: ${desc}`;
      return `  ${i + 1}. Labeled "${section.label}": ${instruction}`;
    })
    .join("\n");

  return `Recreate this reference layout as one finished, ready-to-post Instagram
carousel slide, portrait 4:5 aspect ratio, light blue/white flat background
(#e8eef7 style).
${
  photoCount > 0
    ? `\n${photoCount} reference photo(s) are attached, in the same order as the labeled sections below that say a reference photo is attached.`
    : ""
}

${brandBadge(brand)}

Below the badge, large bold black condensed uppercase headline text, centered,
reading exactly: "DAY ON A PLATE"

Below the headline, a grid of ${sections.length} food photos, each with its
label in bold text above the photo:
${sectionLines}

Below the grid, two black rounded pill badges side by side with bold white
text reading exactly:
  Left pill: "${totalCals} CALS"
  Right pill: "${totalProtein}G PROTEIN"

${attribution()}
Total calories across all sections: ${totalCals} kcal. Total protein:
${totalProtein}g. These are the only numeric totals allowed to appear on the
slide.

${STYLE_GUIDE}`;
}
