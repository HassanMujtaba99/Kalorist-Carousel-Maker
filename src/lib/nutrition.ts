import type { FoodItem } from "./types";

interface UsdaLabelNutrientValue {
  value?: number;
}

interface UsdaLabelNutrients {
  calories?: UsdaLabelNutrientValue;
  protein?: UsdaLabelNutrientValue;
}

interface UsdaFoodNutrient {
  nutrientName?: string;
  nutrientId?: number;
  unitName?: string;
  value?: number;
}

export interface UsdaFoodSearchResult {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  labelNutrients?: UsdaLabelNutrients;
  foodNutrients?: UsdaFoodNutrient[];
}

const ENERGY_NUTRIENT_IDS = new Set([1008, 2047, 2048]);
const PROTEIN_NUTRIENT_ID = 1003;

function findNutrient(
  nutrients: UsdaFoodNutrient[] | undefined,
  predicate: (n: UsdaFoodNutrient) => boolean
): number | undefined {
  const match = nutrients?.find(predicate);
  return typeof match?.value === "number" ? match.value : undefined;
}

/**
 * Normalizes a raw USDA FoodData Central search result into a FoodItem with
 * a best-effort calorie/protein figure. Branded foods carry per-serving
 * labelNutrients (most accurate for restaurant items); everything else
 * falls back to per-100g foodNutrients from the Foundation/SR Legacy/Survey
 * datasets.
 */
export function usdaResultToFoodItem(food: UsdaFoodSearchResult): FoodItem {
  const labelCalories = food.labelNutrients?.calories?.value;
  const labelProtein = food.labelNutrients?.protein?.value;

  let calories = labelCalories;
  let protein = labelProtein;
  let servingDescription =
    food.householdServingFullText ??
    (food.servingSize && food.servingSizeUnit
      ? `${food.servingSize}${food.servingSizeUnit}`
      : undefined);

  if (calories === undefined) {
    calories = findNutrient(
      food.foodNutrients,
      (n) =>
        (n.nutrientId !== undefined && ENERGY_NUTRIENT_IDS.has(n.nutrientId)) ||
        n.nutrientName === "Energy"
    );
    servingDescription = servingDescription ?? "per 100g";
  }

  if (protein === undefined) {
    protein = findNutrient(
      food.foodNutrients,
      (n) => n.nutrientId === PROTEIN_NUTRIENT_ID || n.nutrientName === "Protein"
    );
  }

  return {
    id: `usda-${food.fdcId}`,
    description: food.description,
    brandName: food.brandName || food.brandOwner,
    servingDescription,
    calories: calories ? Math.round(calories) : 0,
    protein: protein ? Math.round(protein) : undefined,
    fdcId: food.fdcId,
    dataType: food.dataType,
    source: "usda",
  };
}

export function sumCalories(items: FoodItem[]): number {
  return items.reduce((total, item) => total + (item.calories || 0), 0);
}

export function sumProtein(items: FoodItem[]): number {
  return items.reduce((total, item) => total + (item.protein || 0), 0);
}
