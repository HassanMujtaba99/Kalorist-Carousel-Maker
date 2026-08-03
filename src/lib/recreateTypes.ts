import type { FoodItem } from "./types";

export interface FoodWithPhoto {
  label: string;
  items: FoodItem[];
  /** Data URL of a user-uploaded photo for this side/section, or null to let AI generate one. */
  photo: string | null;
}

export interface PlateSectionRecreateInput {
  id: string;
  label: string;
  items: FoodItem[];
  photo: string | null;
}
