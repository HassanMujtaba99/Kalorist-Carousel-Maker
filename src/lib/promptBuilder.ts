import type {
  CarouselBrand,
  CtaSlideData,
  DayOnAPlateSlideData,
  FoodItem,
  SlideData,
  ThisOrThatSlideData,
  TitleSlideData,
} from "./types";
import { sumCalories, sumProtein } from "./nutrition";

export const STYLE_GUIDE = `Design system: minimalist Instagram carousel slide for a fitness/nutrition
coaching brand. Portrait orientation, generous white space, clean bold
sans-serif typography (similar to a rounded grotesk / Poppins style), fully
legible spelling with no garbled or misspelled letters. No stock-photo
watermarks, no extra logos, no borders, no captions outside of the slide
itself.`;

export function foodLine(item: FoodItem): string {
  const serving = item.servingDescription ? ` (${item.servingDescription})` : "";
  const brand = item.brandName ? `${item.brandName} ` : "";
  return `${brand}${item.description}${serving} — exactly ${item.calories} kcal${
    item.protein ? `, ${item.protein}g protein` : ""
  }`;
}

export function attribution(): string {
  return `All calorie and protein figures are verified facts sourced from the USDA
FoodData Central database — render every number EXACTLY as given below, do
not round, invent, or alter a single digit.`;
}

export function brandBadge(brand: CarouselBrand): string {
  return `Top-left corner: a small rounded logo badge with the brand name
"${brand.name}" in bold uppercase letters, using ${brand.accentColor} as an
accent color.`;
}

function titlePrompt(data: TitleSlideData, brand: CarouselBrand): string {
  return `Generate one finished, ready-to-post Instagram carousel cover slide, portrait 4:5 aspect ratio.

Background: a candid, high-quality lifestyle photograph — ${data.scenePrompt}

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
  const left = data.leftItems.map(foodLine).join("; ");
  const right = data.rightItems.map(foodLine).join("; ");
  const leftCals = sumCalories(data.leftItems);
  const rightCals = sumCalories(data.rightItems);

  return `Generate one finished, ready-to-post Instagram carousel slide, portrait
4:5 aspect ratio, light blue/white flat background (#e8eef7 style), in the
visual language of an "evidence based nutrition" comparison graphic.

${brandBadge(brand)}

Below the badge, large bold black condensed uppercase headline text, centered,
reading exactly: "THIS OR THAT"

Below the headline, a two-column layout:

LEFT column — labeled "${data.leftLabel}" in bold text below the photo:
  Show appetising product photography of: ${left}
  Below the photo, a black rounded pill badge with bold white text reading
  exactly: "${leftCals} CALS"

RIGHT column — labeled "${data.rightLabel}" in bold text below the photo(s):
  Show appetising product photography of: ${right}
  Below the photo(s), a black rounded pill badge with bold white text reading
  exactly: "${rightCals} CALS"

${attribution()}
Left total: ${leftCals} kcal. Right total: ${rightCals} kcal. These are the
only numbers allowed to appear on the slide.

${STYLE_GUIDE}`;
}

function dayOnAPlatePrompt(data: DayOnAPlateSlideData, brand: CarouselBrand): string {
  const sections = data.sections
    .map((section, i) => {
      const items = section.items.map(foodLine).join("; ");
      return `  ${i + 1}. Labeled "${section.label}": product photography of ${items}`;
    })
    .join("\n");

  const allItems = data.sections.flatMap((s) => s.items);
  const totalCals = sumCalories(allItems);
  const totalProtein = sumProtein(allItems);

  return `Generate one finished, ready-to-post Instagram carousel slide, portrait
4:5 aspect ratio, light blue/white flat background (#e8eef7 style).

${brandBadge(brand)}

Below the badge, large bold black condensed uppercase headline text, centered,
reading exactly: "DAY ON A PLATE"

Below the headline, a 2x2 grid of ${data.sections.length} food photos, each
with its label in bold text above the photo:
${sections}

Below the grid, two black rounded pill badges side by side with bold white
text reading exactly:
  Left pill: "${totalCals} CALS"
  Right pill: "${totalProtein}G PROTEIN"

${attribution()}
Total calories across all four meals: ${totalCals} kcal. Total protein:
${totalProtein}g. These are the only numeric totals allowed to appear on the
slide.

${STYLE_GUIDE}`;
}

function ctaPrompt(data: CtaSlideData, brand: CarouselBrand): string {
  return `Generate one finished, ready-to-post Instagram carousel closing slide,
portrait 4:5 aspect ratio.

Background: a candid, high-quality lifestyle photograph — ${data.scenePrompt}

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
