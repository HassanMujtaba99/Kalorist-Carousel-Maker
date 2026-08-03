import type {
  CarouselState,
  CtaSlideData,
  DayOnAPlateSlideData,
  ProteinSwapSlideData,
  Slide,
  SlideKind,
  ThisOrThatSlideData,
  TitleSlideData,
} from "./types";

export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Content types that can be added to the variable middle of a carousel.
 * Cover and CTA are fixed and not part of this list. More content types
 * (e.g. "step-by-step") will be added here in the future.
 */
export const CONTENT_SLIDE_KINDS: SlideKind[] = ["this-or-that", "day-on-a-plate", "protein-swap"];

export function emptyCarousel(): CarouselState {
  return {
    title: "Untitled Carousel",
    brand: { name: "MY COACHING", accentColor: "#22c55e", badgeTemplate: "pill" },
    cover: createSlide("title"),
    content: [],
    cta: createSlide("cta"),
  };
}

export function slideKindLabel(kind: SlideKind): string {
  switch (kind) {
    case "title":
      return "Title / Hook";
    case "this-or-that":
      return "This or That";
    case "day-on-a-plate":
      return "Day on a Plate";
    case "protein-swap":
      return "Protein Swap";
    case "cta":
      return "Save / CTA";
  }
}

export function createSlide(kind: SlideKind): Slide {
  const id = newId("slide");
  switch (kind) {
    case "title": {
      const data: TitleSlideData = {
        kind: "title",
        headline: "Here's 5 swaps for your favorite fast food",
        scenePrompt:
          "a smiling person in smart casual clothing standing outdoors at golden hour",
      };
      return { id, data, status: "idle" };
    }
    case "this-or-that": {
      const data: ThisOrThatSlideData = {
        kind: "this-or-that",
        leftLabel: "Option A",
        leftItems: [],
        rightLabel: "Option B",
        rightItems: [],
      };
      return { id, data, status: "idle" };
    }
    case "day-on-a-plate": {
      const data: DayOnAPlateSlideData = {
        kind: "day-on-a-plate",
        sections: [
          { id: newId("section"), label: "Breakfast", items: [] },
          { id: newId("section"), label: "Lunch", items: [] },
          { id: newId("section"), label: "Dinner", items: [] },
          { id: newId("section"), label: "Snacks", items: [] },
        ],
      };
      return { id, data, status: "idle" };
    }
    case "protein-swap": {
      const data: ProteinSwapSlideData = {
        kind: "protein-swap",
        headline: "POV: you just learned to build a better plate",
        leftLabel: "Less protein",
        leftItems: [],
        rightLabel: "More protein",
        rightItems: [],
        recommendedSide: "right",
        takeaway: "Same foods. Protein added first.",
      };
      return { id, data, status: "idle" };
    }
    case "cta": {
      const data: CtaSlideData = {
        kind: "cta",
        message: "Save this post for reference",
        scenePrompt:
          "a smiling person laughing outdoors at golden hour, same styling as the cover slide",
      };
      return { id, data, status: "idle" };
    }
  }
}
