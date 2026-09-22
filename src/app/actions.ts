"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

async function userId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function addIngredient(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const name = String(formData.get("name") || "").trim();
  const baseUnit = String(formData.get("base_unit") || "g");
  if (!name || !["g", "ml", "pcs"].includes(baseUnit)) return;

  await supabase.from("ingredients").insert({
    user_id: uid,
    name,
    category: String(formData.get("category") || "").trim() || null,
    base_unit: baseUnit,
    pack_quantity: Math.max(num(formData, "pack_quantity", 1), 0.0001),
    pack_price: Math.max(num(formData, "pack_price", 0), 0),
    yield_percent: Math.min(Math.max(num(formData, "yield_percent", 100), 1), 100),
  });
  revalidatePath("/ingredients");
  revalidatePath("/");
}

export async function deleteIngredient(formData: FormData) {
  const { supabase } = await userId();
  await supabase.from("ingredients").delete().eq("id", String(formData.get("id")));
  revalidatePath("/ingredients");
  revalidatePath("/");
}

export async function addMenu(formData: FormData) {
  const { supabase, userId: uid } = await userId();
  const name = String(formData.get("name") || "").trim();
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
  const id = String(formData.get("id"));
  await supabase.from("menus").update({
    name: String(formData.get("name") || "").trim(),
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
  const id = String(formData.get("id"));
  await supabase.from("menus").delete().eq("id", id);
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function addMenuIngredient(formData: FormData) {
  const { supabase } = await userId();
  const menuId = String(formData.get("menu_id"));
  const ingredientId = String(formData.get("ingredient_id"));
  const quantity = Math.max(num(formData, "quantity", 0), 0.0001);
  if (!menuId || !ingredientId) return;

  await supabase.from("menu_ingredients").upsert(
    { menu_id: menuId, ingredient_id: ingredientId, quantity },
    { onConflict: "menu_id,ingredient_id" },
  );
  revalidatePath(`/menus/${menuId}`);
  revalidatePath("/menus");
  revalidatePath("/");
}

export async function removeMenuIngredient(formData: FormData) {
  const { supabase } = await userId();
  const id = String(formData.get("id"));
  const menuId = String(formData.get("menu_id"));
  await supabase.from("menu_ingredients").delete().eq("id", id);
  revalidatePath(`/menus/${menuId}`);
  revalidatePath("/menus");
  revalidatePath("/");
}
