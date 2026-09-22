import type { Ingredient, Menu } from "@/lib/types";

export function usableQuantity(ingredient: Ingredient) {
  return ingredient.pack_quantity * (ingredient.yield_percent / 100);
}

export function ingredientUnitCost(ingredient: Ingredient) {
  const usable = usableQuantity(ingredient);
  return usable > 0 ? ingredient.pack_price / usable : 0;
}

export function ingredientLineCost(ingredient: Ingredient, quantity: number) {
  return ingredientUnitCost(ingredient) * quantity;
}

export function menuCosts(
  menu: Menu,
  ingredientCostTotal: number,
) {
  const batchCost = ingredientCostTotal + menu.packaging_cost + menu.overhead_cost;
  const servings = Math.max(menu.servings, 1);
  const costPerServing = batchCost / servings;
  const foodCostPercent = menu.sell_price > 0 ? (costPerServing / menu.sell_price) * 100 : 0;
  const target = menu.target_food_cost_percent > 0 ? menu.target_food_cost_percent : 30;
  const suggestedSellPrice = costPerServing / (target / 100);
  const grossProfitPerServing = menu.sell_price - costPerServing;

  return {
    batchCost,
    costPerServing,
    foodCostPercent,
    suggestedSellPrice,
    grossProfitPerServing,
  };
}

export function thb(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(value || 0);
}
