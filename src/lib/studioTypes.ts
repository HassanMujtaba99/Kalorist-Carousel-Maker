/** One user-editable box overlaid on a reference image, identifying a
 * specific item (food, dish, badge, text element, ...). Coordinates are
 * percentages (0-100) of the image's displayed box, so they're resolution-
 * independent for rendering. */
export interface AnnotatedItem {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReferenceAnalysis {
  id: string;
  image: string;
  items: AnnotatedItem[];
  status: "pending" | "analyzing" | "done" | "error";
  error?: string;
}
