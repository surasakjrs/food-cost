import type { BaseUnit, Ingredient, IngredientConversion, Menu, SubRecipe } from "@/lib/types";

export function usableQuantity(ingredient: Ingredient) {
  return Number(ingredient.pack_quantity) * (Number(ingredient.yield_percent) / 100);
}

export function ingredientUnitCost(ingredient: Ingredient) {
  const usable = usableQuantity(ingredient);
  return usable > 0 ? Number(ingredient.pack_price) / usable : 0;
}

export function convertStandardUnit(quantity: number, fromUnit: string, toBaseUnit: BaseUnit) {
  const from = fromUnit.trim().toLowerCase();
  if (from === toBaseUnit) return quantity;
  if (toBaseUnit === "g") {
    if (from === "kg") return quantity * 1000;
    if (from === "mg") return quantity / 1000;
  }
  if (toBaseUnit === "ml") {
    if (from === "l" || from === "liter" || from === "litre") return quantity * 1000;
  }
  if (toBaseUnit === "pcs" && ["pc", "piece", "pieces", "ชิ้น"].includes(from)) return quantity;
  return null;
}

export function ingredientQuantityInBase(
  ingredient: Ingredient,
  quantity: number,
  unit: string,
  conversions: IngredientConversion[] = [],
) {
  const standard = convertStandardUnit(quantity, unit, ingredient.base_unit);
  if (standard !== null) return standard;
  const custom = conversions.find(
    (item) => item.ingredient_id === ingredient.id && item.unit_name.trim().toLowerCase() === unit.trim().toLowerCase(),
  );
  if (custom) return quantity * Number(custom.base_quantity);
  return null;
}

export function ingredientLineCost(
  ingredient: Ingredient,
  quantity: number,
  unit = ingredient.base_unit,
  conversions: IngredientConversion[] = [],
) {
  const baseQty = ingredientQuantityInBase(ingredient, quantity, unit, conversions);
  return baseQty === null ? 0 : ingredientUnitCost(ingredient) * baseQty;
}

export function recipeUsableOutput(recipe: SubRecipe) {
  return Number(recipe.output_quantity) * (Number(recipe.yield_percent) / 100);
}

export function recipeUnitCost(recipe: SubRecipe, recipeBatchIngredientCost: number) {
  const usableOutput = recipeUsableOutput(recipe);
  return usableOutput > 0 ? recipeBatchIngredientCost / usableOutput : 0;
}

export function recipeLineCost(recipe: SubRecipe, recipeBatchIngredientCost: number, quantity: number, unit: string) {
  const baseQty = convertStandardUnit(quantity, unit, recipe.output_unit);
  return baseQty === null ? 0 : recipeUnitCost(recipe, recipeBatchIngredientCost) * baseQty;
}

export function menuCosts(menu: Menu, ingredientCostTotal: number, subRecipeCostTotal = 0) {
  const batchCost = ingredientCostTotal + subRecipeCostTotal + Number(menu.packaging_cost) + Number(menu.overhead_cost);
  const servings = Math.max(Number(menu.servings), 1);
  const costPerServing = batchCost / servings;
  const foodCostPercent = Number(menu.sell_price) > 0 ? (costPerServing / Number(menu.sell_price)) * 100 : 0;
  const target = Number(menu.target_food_cost_percent) > 0 ? Number(menu.target_food_cost_percent) : 30;
  const suggestedSellPrice = costPerServing / (target / 100);
  const grossProfitPerServing = Number(menu.sell_price) - costPerServing;

  return { batchCost, costPerServing, foodCostPercent, suggestedSellPrice, grossProfitPerServing };
}

export function thb(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function fmtNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: digits }).format(value || 0);
}
