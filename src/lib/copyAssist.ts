import type { FoodItem } from "./types";

const COMMON_VOICE = `Voice: energetic, evidence-based nutrition coach content for Instagram.
Short, punchy, no hashtags, no emoji, no quotation marks around the output.`;

export function buildHeadlinePrompt(brief: string): string {
  return `Write one scroll-stopping Instagram carousel cover headline, max 12 words.
${COMMON_VOICE}
Rough idea to work from: "${brief || "a nutrition tip for a general audience"}"
Reply with ONLY the headline text on a single line — no preamble, no label.`;
}

export function buildCtaPrompt(brief: string): string {
  return `Write one short call-to-action line for the closing slide of an Instagram
carousel (e.g. asking people to save, share, or follow), max 8 words.
${COMMON_VOICE}
Rough idea to work from: "${brief || "save this post for reference"}"
Reply with ONLY the CTA text on a single line — no preamble, no label.`;
}

function foodContext(items: FoodItem[]): string {
  if (items.length === 0) return "(no foods picked yet)";
  return items.map((i) => i.description).join(", ");
}

export function buildThisOrThatLabelsPrompt(
  leftBrief: string,
  rightBrief: string,
  leftItems: FoodItem[],
  rightItems: FoodItem[]
): string {
  return `Write two short punchy labels (2-4 words each) for a "this or that" food
comparison carousel slide.
${COMMON_VOICE}
Left side foods: ${foodContext(leftItems)}. Rough label idea: "${leftBrief}"
Right side foods: ${foodContext(rightItems)}. Rough label idea: "${rightBrief}"
Reply with EXACTLY two lines, nothing else, in this format:
LEFT: <label>
RIGHT: <label>`;
}

export function parseThisOrThatLabels(
  text: string
): { left: string; right: string } | null {
  const leftMatch = text.match(/LEFT:\s*(.+)/i);
  const rightMatch = text.match(/RIGHT:\s*(.+)/i);
  if (!leftMatch || !rightMatch) return null;
  return {
    left: leftMatch[1].trim(),
    right: rightMatch[1].trim(),
  };
}

export function buildProteinSwapTakeawayPrompt(
  leftItems: FoodItem[],
  rightItems: FoodItem[]
): string {
  return `Write one short, punchy one-liner (max 10 words) that sums up the insight
of a "same meal, more protein" comparison graphic for Instagram — the kind
of line that goes under two side-by-side plates, e.g. "Same foods. Protein
added first." or "Fried food fills you up. Protein keeps you full."
${COMMON_VOICE}
Lower-protein side foods: ${foodContext(leftItems)}
Higher-protein side foods: ${foodContext(rightItems)}
Reply with ONLY the line — no preamble, no label.`;
}
