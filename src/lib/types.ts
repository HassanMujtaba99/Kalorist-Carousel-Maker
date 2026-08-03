export type FoodSource = "usda" | "manual";

export interface FoodItem {
  id: string;
  description: string;
  brandName?: string;
  servingDescription?: string;
  calories: number;
  protein?: number;
  fdcId?: number;
  dataType?: string;
  source: FoodSource;
  /** True when this is a generic stand-in USDA couldn't find data for the
   * originally requested specific food/brand (e.g. a plain "cheeseburger"
   * substituted for "McDonald's Cheeseburger") — the number is still a real,
   * verified USDA figure, just for a close equivalent, not the exact item. */
  approximated?: boolean;
}

export interface TitleSlideData {
  kind: "title";
  headline: string;
  subheadline?: string;
  scenePrompt: string;
  /** A user-uploaded photo (data URL) to use as-is instead of an AI-imagined scene. */
  photo?: string | null;
}

export interface ThisOrThatSlideData {
  kind: "this-or-that";
  leftLabel: string;
  leftItems: FoodItem[];
  rightLabel: string;
  rightItems: FoodItem[];
}

export interface PlateSection {
  id: string;
  label: string;
  items: FoodItem[];
}

export interface DayOnAPlateSlideData {
  kind: "day-on-a-plate";
  sections: PlateSection[];
}

export interface CtaSlideData {
  kind: "cta";
  message: string;
  scenePrompt: string;
  /** A user-uploaded photo (data URL) to use as-is instead of an AI-imagined scene. */
  photo?: string | null;
}

/**
 * "Protein swap" comparison: the same kind of meal shown two ways — a lower-
 * protein version and a higher-protein version — each a real list of foods
 * with a summed protein/calorie total, one side marked as the recommended
 * pick (gets a checkmark on the slide).
 */
export interface ProteinSwapSlideData {
  kind: "protein-swap";
  headline: string;
  leftLabel: string;
  leftItems: FoodItem[];
  rightLabel: string;
  rightItems: FoodItem[];
  recommendedSide: "left" | "right";
  takeaway: string;
}

export type SlideData =
  | TitleSlideData
  | ThisOrThatSlideData
  | DayOnAPlateSlideData
  | ProteinSwapSlideData
  | CtaSlideData;

export type SlideKind = SlideData["kind"];

export type SlideStatus = "idle" | "generating" | "done" | "error";

export interface Slide {
  id: string;
  data: SlideData;
  imageDataUrl?: string;
  status: SlideStatus;
  error?: string;
}

/** Visual template for the brand name tag rendered on every slide. Giving
 * the image model a precise, fixed shape per template (instead of one vague
 * "logo badge" description) makes the badge render consistently across
 * slides in the same carousel instead of reinterpreted differently each
 * generation. */
export type BadgeTemplate = "pill" | "ribbon" | "circle" | "underline";

export interface CarouselBrand {
  name: string;
  accentColor: string;
  badgeTemplate: BadgeTemplate;
}

export interface CarouselState {
  title: string;
  brand: CarouselBrand;
  /** Fixed opening slide — always present, always first, not reorderable. */
  cover: Slide;
  /**
   * The variable middle of the carousel. Each entry is a "content slide" of
   * some content type (today only "this-or-that"; more types like
   * "step-by-step" will be added later). Freely addable, removable, and
   * reorderable among themselves.
   */
  content: Slide[];
  /** Fixed closing slide — always present, always last, not reorderable. */
  cta: Slide;
}

/** Which provider drafts on-slide copy (headlines, labels, CTAs). Image
 * generation is unaffected — that always uses Gemini. */
export type CopyProvider = "anthropic" | "gemini" | "openai" | "custom";

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  usdaApiKey: string;
  copyProvider: CopyProvider;
  anthropicApiKey: string;
  anthropicModel: string;
  /** Text model for copy drafting — reuses geminiApiKey above. */
  geminiCopyModel: string;
  openaiApiKey: string;
  openaiModel: string;
  /** Any OpenAI-compatible chat completions endpoint (Groq, Mistral, a local Ollama, etc). */
  customApiKey: string;
  customModel: string;
  customBaseUrl: string;
}
