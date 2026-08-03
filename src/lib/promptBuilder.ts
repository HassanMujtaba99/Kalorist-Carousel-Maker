import type {
  BadgeTemplate,
  CarouselBrand,
  CtaSlideData,
  DayOnAPlateSlideData,
  SlideData,
  ThisOrThatSlideData,
  TitleSlideData,
} from "./types";
import { sumCalories, sumProtein } from "./nutrition";

export const STYLE_GUIDE = `Design system: minimalist Instagram carousel slide for a fitness/nutrition
coaching brand. Portrait orientation, generous white space, clean bold
sans-serif typography (similar to a rounded grotesk / Poppins style), fully
legible spelling with no garbled or misspelled letters. Keep the whole
composition as clean and simple as possible: a single flat background color,
no gradients, no textures, no decorative patterns, no stock-photo
watermarks, no extra logos or icons beyond what's explicitly described
below, no borders, no captions outside of the slide itself. Every element
should earn its place — when in doubt, leave it out.`;

/**
 * What to literally photograph — driven entirely by the human-facing label,
 * never by the raw USDA item description or its calorie/protein figures.
 * The underlying FoodItem can be a generic approximation (see
 * carouselBrainstorm.ts) that no longer visually matches the specific thing
 * the label promises, and mixing nutrition-fact text into a photography
 * instruction ("product photography of X — exactly 300 kcal") confuses the
 * image model into rendering stray numbers/text into the photo itself.
 * Numbers only ever appear via the pill badge instruction and attribution().
 */
export function photoSubject(label: string): string {
  return `exactly what this label describes: "${label}" — nothing else, no extra food items, no text or numbers baked into the photo itself`;
}

export function attribution(): string {
  return `All calorie and protein figures are verified facts sourced from the USDA
FoodData Central database — render every number EXACTLY as given below, do
not round, invent, or alter a single digit.`;
}

export const BADGE_TEMPLATES: { id: BadgeTemplate; label: string; preview: string }[] = [
  { id: "pill", label: "Rounded Pill", preview: "⬭ Solid rounded pill" },
  { id: "ribbon", label: "Corner Ribbon", preview: "◤ Diagonal ribbon" },
  { id: "circle", label: "Circle Seal", preview: "⬤ Circular seal" },
  { id: "underline", label: "Underline", preview: "_ Text + underline" },
];

/**
 * Brand name tag instructions, one per template. Each is deliberately
 * precise about shape/size/color and explicitly bans extras (icons,
 * gradients, textures) — a vague instruction like "a small logo badge" gets
 * reinterpreted differently by the image model on every single generation,
 * which is what made the badge look inconsistent from slide to slide.
 */
export function brandBadge(brand: CarouselBrand): string {
  const name = brand.name;
  const color = brand.accentColor;
  switch (brand.badgeTemplate) {
    case "ribbon":
      return `Top-left corner: a small diagonal ribbon banner folded across the very
corner of the image, filled with a single flat color ${color}, with the
brand name "${name}" in bold white uppercase letters running along the
ribbon. Flat color only — no gradient, no texture, no icon, no shadow.`;
    case "circle":
      return `Top-left corner: one small solid circular badge (like a plain seal or
stamp), filled with a single flat color ${color}, with the brand name
"${name}" in bold white uppercase letters centered inside the circle
(stacked on two lines if needed to fit). Flat color only — no gradient, no
texture, no icon, no shadow.`;
    case "underline":
      return `Top-left corner: no badge shape at all — just the brand name "${name}"
as bold uppercase text in the color ${color}, with a short solid
underline in the same color directly beneath it. No background fill, no
border, no icon.`;
    case "pill":
    default:
      return `Top-left corner: one small solid rounded-rectangle pill badge, filled
with a single flat color ${color}, with the brand name "${name}" in bold
white uppercase letters centered inside it. Flat color only — no gradient,
no texture, no icon, no shadow.`;
  }
}

/** Background instruction shared by title/cta prompts: use an attached photo
 * as-is if one was uploaded, otherwise fall back to imagining a scene. */
function backgroundInstruction(scenePrompt: string, hasPhoto: boolean): string {
  return hasPhoto
    ? `A reference photo is attached. Use it EXACTLY as the background image of
the slide — do not regenerate, replace, or meaningfully alter the photo
itself (light crop/contrast touch-ups for legibility and portrait 4:5
framing are fine).`
    : `Background: a candid, high-quality lifestyle photograph — ${scenePrompt}`;
}

function titlePrompt(data: TitleSlideData, brand: CarouselBrand): string {
  return `Generate one finished, ready-to-post Instagram carousel cover slide, portrait 4:5 aspect ratio.

${backgroundInstruction(data.scenePrompt, !!data.photo)}

Overlay near the top of the image: a solid black rounded rectangle badge
(like a speech-bubble callout with a small pointer tail) containing bold
white uppercase headline text, centered, that reads EXACTLY:
"${data.headline}"
${
  data.subheadline
    ? `Directly below it inside the same badge, smaller bold white text reads exactly: "${data.subheadline}"`
    : ""
}

${brandBadge(brand)}

${STYLE_GUIDE}
Spell every word in the headline correctly and exactly as written above.`;
}

function thisOrThatPrompt(data: ThisOrThatSlideData, brand: CarouselBrand): string {
  const leftCals = sumCalories(data.leftItems);
  const rightCals = sumCalories(data.rightItems);

  return `Generate one finished, ready-to-post Instagram carousel slide, portrait
4:5 aspect ratio, a single solid flat light blue background color (#e8eef7,
no gradient, no texture, no pattern), in the visual language of a clean
"evidence based nutrition" comparison graphic.

${brandBadge(brand)}

Below the badge, large bold black condensed uppercase headline text, centered,
reading exactly: "THIS OR THAT"

Below the headline, a two-column layout:

LEFT column — labeled "${data.leftLabel}" in bold text below the photo:
  Show one simple, appetising product photo of ${photoSubject(data.leftLabel)}
  Below the photo, a black rounded pill badge with bold white text reading
  exactly: "${leftCals} CALS"

RIGHT column — labeled "${data.rightLabel}" in bold text below the photo(s):
  Show one simple, appetising product photo of ${photoSubject(data.rightLabel)}
  Below the photo(s), a black rounded pill badge with bold white text reading
  exactly: "${rightCals} CALS"

${attribution()}
Left total: ${leftCals} kcal. Right total: ${rightCals} kcal. These are the
only numbers allowed to appear on the slide.

${STYLE_GUIDE}`;
}

function dayOnAPlatePrompt(data: DayOnAPlateSlideData, brand: CarouselBrand): string {
  const sections = data.sections
    .map((section, i) => `  ${i + 1}. Labeled "${section.label}": one simple product photo of ${photoSubject(section.label)}`)
    .join("\n");

  const allItems = data.sections.flatMap((s) => s.items);
  const totalCals = sumCalories(allItems);
  const totalProtein = sumProtein(allItems);

  return `Generate one finished, ready-to-post Instagram carousel slide, portrait
4:5 aspect ratio, a single solid flat light blue background color (#e8eef7,
no gradient, no texture, no pattern).

${brandBadge(brand)}

Below the badge, large bold black condensed uppercase headline text, centered,
reading exactly: "DAY ON A PLATE"

Below the headline, an evenly-spaced grid of exactly ${data.sections.length}
food photo${data.sections.length === 1 ? "" : "s"}${
    data.sections.length === 4 ? " (2x2)" : ""
  }, each with its label in bold text above the photo:
${sections}

Below the grid, two black rounded pill badges side by side with bold white
text reading exactly:
  Left pill: "${totalCals} CALS"
  Right pill: "${totalProtein}G PROTEIN"

${attribution()}
Total calories across all ${data.sections.length} sections: ${totalCals} kcal.
Total protein: ${totalProtein}g. These are the only numeric totals allowed to
appear on the slide.

${STYLE_GUIDE}`;
}

function ctaPrompt(data: CtaSlideData, brand: CarouselBrand): string {
  return `Generate one finished, ready-to-post Instagram carousel closing slide,
portrait 4:5 aspect ratio.

${backgroundInstruction(data.scenePrompt, !!data.photo)}

Overlay near the top of the image: a solid black rounded rectangle badge
containing bold white uppercase-first-letter text, centered, that reads
EXACTLY: "${data.message}"

${brandBadge(brand)}

${STYLE_GUIDE}
Spell every word correctly and exactly as written above.`;
}

export function buildSlidePrompt(data: SlideData, brand: CarouselBrand): string {
  switch (data.kind) {
    case "title":
      return titlePrompt(data, brand);
    case "this-or-that":
      return thisOrThatPrompt(data, brand);
    case "day-on-a-plate":
      return dayOnAPlatePrompt(data, brand);
    case "cta":
      return ctaPrompt(data, brand);
  }
}

/** Reference photo(s) (data URLs) to send alongside the prompt for image
 * generation — currently just the optional cover/CTA background photo. */
export function slidePhotos(data: SlideData): string[] {
  if ((data.kind === "title" || data.kind === "cta") && data.photo) {
    return [data.photo];
  }
  return [];
}
