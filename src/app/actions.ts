"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function userId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function addIngredient(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const name = str(formData, "name");
  const baseUnit = str(formData, "base_unit") || "g";
  if (!name || !["g", "ml", "pcs"].includes(baseUnit)) return;

  const packQuantity = Math.max(num(formData, "pack_quantity", 1), 0.0001);
  const packPrice = Math.max(num(formData, "pack_price", 0), 0);
  const { data } = await supabase.from("ingredients").insert({
    user_id: uid,
    name,
    category: str(formData, "category") || null,
    base_unit: baseUnit,
    pack_quantity: packQuantity,
    pack_price: packPrice,
    yield_percent: Math.min(Math.max(num(formData, "yield_percent", 100), 1), 100),
  }).select("id").single();

  if (data?.id) {
    await supabase.from("ingredient_prices").insert({
      user_id: uid,
      ingredient_id: data.id,
      pack_quantity: packQuantity,
      pack_price: packPrice,
      note: "ราคาเริ่มต้น",
    });
  }
  revalidatePath("/ingredients");
  revalidatePath("/prices");
  revalidatePath("/");
}

export async function deleteIngredient(formData: FormData) {
  const { supabase } = await userId();
  await supabase.from("ingredients").delete().eq("id", str(formData, "id"));
  revalidatePath("/ingredients");
  revalidatePath("/");
}

export async function addIngredientConversion(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const ingredientId = str(formData, "ingredient_id");
  const unitName = str(formData, "unit_name").toLowerCase();
  if (!ingredientId || !unitName) return;
  await supabase.from("ingredient_conversions").upsert({
    user_id: uid,
    ingredient_id: ingredientId,
    unit_name: unitName,
    base_quantity: Math.max(num(formData, "base_quantity", 1), 0.000001),
  }, { onConflict: "ingredient_id,unit_name" });
  revalidatePath("/ingredients");
}

export async function deleteIngredientConversion(formData: FormData) {
  const { supabase } = await userId();
  await supabase.from("ingredient_conversions").delete().eq("id", str(formData, "id"));
  revalidatePath("/ingredients");
}

export async function addSupplier(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const name = str(formData, "name");
  if (!name) return;
  await supabase.from("suppliers").insert({
    user_id: uid,
    name,
    contact_name: str(formData, "contact_name") || null,
    phone: str(formData, "phone") || null,
    email: str(formData, "email") || null,
    notes: str(formData, "notes") || null,
  });
  revalidatePath("/suppliers");
}

export async function deleteSupplier(formData: FormData) {
  const { supabase } = await userId();
  await supabase.from("suppliers").delete().eq("id", str(formData, "id"));
  revalidatePath("/suppliers");
}

export async function addIngredientPrice(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const ingredientId = str(formData, "ingredient_id");
  if (!ingredientId) return;
  const packQuantity = Math.max(num(formData, "pack_quantity", 1), 0.0001);
  const packPrice = Math.max(num(formData, "pack_price", 0), 0);
  const supplierId = str(formData, "supplier_id") || null;
  const recordedAt = str(formData, "recorded_at") || new Date().toISOString();

  await supabase.from("ingredient_prices").insert({
    user_id: uid,
    ingredient_id: ingredientId,
    supplier_id: supplierId,
    pack_quantity: packQuantity,
    pack_price: packPrice,
    recorded_at: recordedAt,
    note: str(formData, "note") || null,
  });

  await supabase.from("ingredients").update({
    pack_quantity: packQuantity,
    pack_price: packPrice,
  }).eq("id", ingredientId);

  revalidatePath("/prices");
  revalidatePath("/ingredients");
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function addMenu(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const name = str(formData, "name");
  if (!name) return;

  const { data } = await supabase.from("menus").insert({
    user_id: uid,
    name,
    servings: Math.max(Math.floor(num(formData, "servings", 1)), 1),
    sell_price: Math.max(num(formData, "sell_price", 0), 0),
    packaging_cost: Math.max(num(formData, "packaging_cost", 0), 0),
    overhead_cost: Math.max(num(formData, "overhead_cost", 0), 0),
    target_food_cost_percent: Math.min(Math.max(num(formData, "target_food_cost_percent", 30), 1), 100),
  }).select("id").single();

  revalidatePath("/menus");
  revalidatePath("/");
  if (data?.id) redirect(`/menus/${data.id}`);
}

export async function updateMenu(formData: FormData) {
  const { supabase } = await userId();
  const id = str(formData, "id");
  await supabase.from("menus").update({
    name: str(formData, "name"),
    servings: Math.max(Math.floor(num(formData, "servings", 1)), 1),
    sell_price: Math.max(num(formData, "sell_price", 0), 0),
    packaging_cost: Math.max(num(formData, "packaging_cost", 0), 0),
    overhead_cost: Math.max(num(formData, "overhead_cost", 0), 0),
    target_food_cost_percent: Math.min(Math.max(num(formData, "target_food_cost_percent", 30), 1), 100),
  }).eq("id", id);
  revalidatePath(`/menus/${id}`);
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function deleteMenu(formData: FormData) {
  const { supabase } = await userId();
  await supabase.from("menus").delete().eq("id", str(formData, "id"));
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function addMenuIngredient(formData: FormData) {
  const { supabase } = await userId();
  const menuId = str(formData, "menu_id");
  const ingredientId = str(formData, "ingredient_id");
  if (!menuId || !ingredientId) return;
  await supabase.from("menu_ingredients").upsert({
    menu_id: menuId,
    ingredient_id: ingredientId,
    quantity: Math.max(num(formData, "quantity", 0), 0.0001),
    unit: str(formData, "unit") || "g",
  }, { onConflict: "menu_id,ingredient_id" });
  revalidatePath(`/menus/${menuId}`);
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function removeMenuIngredient(formData: FormData) {
  const { supabase } = await userId();
  const menuId = str(formData, "menu_id");
  await supabase.from("menu_ingredients").delete().eq("id", str(formData, "id"));
  revalidatePath(`/menus/${menuId}`);
  revalidatePath("/");
}

export async function addSubRecipe(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const name = str(formData, "name");
  const outputUnit = str(formData, "output_unit") || "g";
  if (!name || !["g", "ml", "pcs"].includes(outputUnit)) return;
  const { data } = await supabase.from("sub_recipes").insert({
    user_id: uid,
    name,
    output_quantity: Math.max(num(formData, "output_quantity", 1), 0.0001),
    output_unit: outputUnit,
    yield_percent: Math.min(Math.max(num(formData, "yield_percent", 100), 1), 100),
    notes: str(formData, "notes") || null,
  }).select("id").single();
  revalidatePath("/recipes");
  if (data?.id) redirect(`/recipes/${data.id}`);
}

export async function updateSubRecipe(formData: FormData) {
  const { supabase } = await userId();
  const id = str(formData, "id");
  await supabase.from("sub_recipes").update({
    name: str(formData, "name"),
    output_quantity: Math.max(num(formData, "output_quantity", 1), 0.0001),
    output_unit: str(formData, "output_unit") || "g",
    yield_percent: Math.min(Math.max(num(formData, "yield_percent", 100), 1), 100),
    notes: str(formData, "notes") || null,
  }).eq("id", id);
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/recipes");
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function deleteSubRecipe(formData: FormData) {
  const { supabase } = await userId();
  await supabase.from("sub_recipes").delete().eq("id", str(formData, "id"));
  revalidatePath("/recipes");
}

export async function addSubRecipeIngredient(formData: FormData) {
  const { supabase } = await userId();
  const recipeId = str(formData, "sub_recipe_id");
  const ingredientId = str(formData, "ingredient_id");
  if (!recipeId || !ingredientId) return;
  await supabase.from("sub_recipe_ingredients").upsert({
    sub_recipe_id: recipeId,
    ingredient_id: ingredientId,
    quantity: Math.max(num(formData, "quantity", 0), 0.0001),
    unit: str(formData, "unit") || "g",
  }, { onConflict: "sub_recipe_id,ingredient_id" });
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function removeSubRecipeIngredient(formData: FormData) {
  const { supabase } = await userId();
  const recipeId = str(formData, "sub_recipe_id");
  await supabase.from("sub_recipe_ingredients").delete().eq("id", str(formData, "id"));
  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/");
}

export async function addMenuSubRecipe(formData: FormData) {
  const { supabase } = await userId();
  const menuId = str(formData, "menu_id");
  const subRecipeId = str(formData, "sub_recipe_id");
  if (!menuId || !subRecipeId) return;
  await supabase.from("menu_sub_recipes").upsert({
    menu_id: menuId,
    sub_recipe_id: subRecipeId,
    quantity: Math.max(num(formData, "quantity", 0), 0.0001),
    unit: str(formData, "unit") || "g",
  }, { onConflict: "menu_id,sub_recipe_id" });
  revalidatePath(`/menus/${menuId}`);
  revalidatePath("/");
}

export async function removeMenuSubRecipe(formData: FormData) {
  const { supabase } = await userId();
  const menuId = str(formData, "menu_id");
  await supabase.from("menu_sub_recipes").delete().eq("id", str(formData, "id"));
  revalidatePath(`/menus/${menuId}`);
  revalidatePath("/");
}

export async function adjustStock(formData: FormData) {
  const { supabase } = await userId();
  const ingredientId = str(formData, "ingredient_id");
  const quantity = num(formData, "quantity_delta", 0);
  if (!ingredientId || quantity === 0) return;
  await supabase.rpc("apply_stock_movement", {
    p_ingredient_id: ingredientId,
    p_quantity_delta: quantity,
    p_kind: str(formData, "kind") || "ADJUSTMENT",
    p_unit_cost: null,
    p_note: str(formData, "note") || null,
  });
  revalidatePath("/stock");
  revalidatePath("/");
}

export async function setReorderLevel(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const ingredientId = str(formData, "ingredient_id");
  const reorderLevel = Math.max(num(formData, "reorder_level", 0), 0);
  if (!ingredientId) return;
  await supabase.from("inventory").upsert({
    user_id: uid,
    ingredient_id: ingredientId,
    reorder_level: reorderLevel,
  }, { onConflict: "user_id,ingredient_id" });
  revalidatePath("/stock");
  revalidatePath("/");
}

export async function createPurchaseOrder(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const poNumber = str(formData, "po_number") || `PO-${Date.now()}`;
  const { data } = await supabase.from("purchase_orders").insert({
    user_id: uid,
    supplier_id: str(formData, "supplier_id") || null,
    po_number: poNumber,
    notes: str(formData, "notes") || null,
  }).select("id").single();
  revalidatePath("/purchases");
  if (data?.id) redirect(`/purchases/${data.id}`);
}

export async function addPurchaseOrderItem(formData: FormData) {
  const { supabase } = await userId();
  const purchaseOrderId = str(formData, "purchase_order_id");
  const ingredientId = str(formData, "ingredient_id");
  if (!purchaseOrderId || !ingredientId) return;
  await supabase.from("purchase_order_items").upsert({
    purchase_order_id: purchaseOrderId,
    ingredient_id: ingredientId,
    quantity_packs: Math.max(num(formData, "quantity_packs", 1), 0.0001),
    pack_quantity: Math.max(num(formData, "pack_quantity", 1), 0.0001),
    unit_pack_price: Math.max(num(formData, "unit_pack_price", 0), 0),
  }, { onConflict: "purchase_order_id,ingredient_id" });
  revalidatePath(`/purchases/${purchaseOrderId}`);
}

export async function removePurchaseOrderItem(formData: FormData) {
  const { supabase } = await userId();
  const purchaseOrderId = str(formData, "purchase_order_id");
  await supabase.from("purchase_order_items").delete().eq("id", str(formData, "id"));
  revalidatePath(`/purchases/${purchaseOrderId}`);
}

export async function setPurchaseOrderStatus(formData: FormData) {
  const { supabase } = await userId();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!["DRAFT", "ORDERED", "CANCELLED"].includes(status)) return;
  const patch: Record<string, unknown> = { status };
  if (status === "ORDERED") patch.ordered_at = new Date().toISOString();
  await supabase.from("purchase_orders").update(patch).eq("id", id);
  revalidatePath(`/purchases/${id}`);
  revalidatePath("/purchases");
  revalidatePath("/");
}

export async function receivePurchaseOrder(formData: FormData) {
  const { supabase } = await userId();
  const id = str(formData, "id");
  await supabase.rpc("receive_purchase_order", { p_purchase_order_id: id });
  revalidatePath(`/purchases/${id}`);
  revalidatePath("/purchases");
  revalidatePath("/stock");
  revalidatePath("/prices");
  revalidatePath("/ingredients");
  revalidatePath("/menus");
  revalidatePath("/");
}
