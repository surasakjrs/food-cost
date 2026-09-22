export type BaseUnit = "g" | "ml" | "pcs";

export type Profile = {
  user_id: string;
  username: string;
  username_normalized: string;
  auth_email: string;
  created_at: string;
  updated_at: string;
};

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

export type IngredientConversion = {
  id: string;
  user_id: string;
  ingredient_id: string;
  unit_name: string;
  base_quantity: number;
  created_at: string;
};

export type IngredientPrice = {
  id: string;
  user_id: string;
  ingredient_id: string;
  supplier_id: string | null;
  pack_quantity: number;
  pack_price: number;
  recorded_at: string;
  note: string | null;
  created_at: string;
};

export type Supplier = {
  id: string;
  user_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
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
  unit: string;
  created_at: string;
};

export type SubRecipe = {
  id: string;
  user_id: string;
  name: string;
  output_quantity: number;
  output_unit: BaseUnit;
  yield_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SubRecipeIngredient = {
  id: string;
  sub_recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  created_at: string;
};

export type MenuSubRecipe = {
  id: string;
  menu_id: string;
  sub_recipe_id: string;
  quantity: number;
  unit: string;
  created_at: string;
};

export type Inventory = {
  id: string;
  user_id: string;
  ingredient_id: string;
  quantity_on_hand: number;
  reorder_level: number;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  user_id: string;
  ingredient_id: string;
  kind: "PURCHASE" | "ADJUSTMENT" | "USAGE" | "WASTE" | "RETURN";
  quantity_delta: number;
  unit_cost: number | null;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  created_at: string;
};

export type PurchaseOrder = {
  id: string;
  user_id: string;
  supplier_id: string | null;
  po_number: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string;
  ingredient_id: string;
  quantity_packs: number;
  pack_quantity: number;
  unit_pack_price: number;
  created_at: string;
};
