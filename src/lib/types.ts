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
}

export interface TitleSlideData {
  kind: "title";
  headline: string;
  subheadline?: string;
  scenePrompt: string;
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
}

export type SlideData =
  | TitleSlideData
  | ThisOrThatSlideData
  | DayOnAPlateSlideData
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

export interface CarouselBrand {
  name: string;
  accentColor: string;
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
