export type BaseUnit = "g" | "ml" | "pcs";

export type Ingredient = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  base_unit: BaseUnit;
  pack_quantity: number;
  pack_price: number;
  yield_percent: number;
  created_at: string;
  updated_at: string;
};

export type Menu = {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  sell_price: number;
  packaging_cost: number;
  overhead_cost: number;
  target_food_cost_percent: number;
  created_at: string;
  updated_at: string;
};

export type MenuIngredient = {
  id: string;
  menu_id: string;
  ingredient_id: string;
  quantity: number;
  created_at: string;
};
