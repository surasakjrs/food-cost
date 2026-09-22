import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { ingredientLineCost, menuCosts, recipeLineCost, thb } from "@/lib/cost";
import type { Ingredient, IngredientConversion, Inventory, Menu, MenuIngredient, MenuSubRecipe, PurchaseOrder, SubRecipe, SubRecipeIngredient } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [
    { data: ingredientsData }, { data: menusData }, { data: linesData }, { data: conversionsData },
    { data: recipesData }, { data: recipeLinesData }, { data: menuRecipesData },
    { data: inventoryData }, { data: ordersData },
  ] = await Promise.all([
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("menus").select("*").order("created_at", { ascending: false }),
    supabase.from("menu_ingredients").select("*"),
    supabase.from("ingredient_conversions").select("*"),
    supabase.from("sub_recipes").select("*"),
    supabase.from("sub_recipe_ingredients").select("*"),
    supabase.from("menu_sub_recipes").select("*"),
    supabase.from("inventory").select("*"),
    supabase.from("purchase_orders").select("*"),
  ]);

  const ingredients = (ingredientsData || []) as Ingredient[];
  const menus = (menusData || []) as Menu[];
  const lines = (linesData || []) as MenuIngredient[];
  const conversions = (conversionsData || []) as IngredientConversion[];
  const recipes = (recipesData || []) as SubRecipe[];
  const recipeLines = (recipeLinesData || []) as SubRecipeIngredient[];
  const menuRecipes = (menuRecipesData || []) as MenuSubRecipe[];
  const inventory = (inventoryData || []) as Inventory[];
  const orders = (ordersData || []) as PurchaseOrder[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));
  const recipeMap = new Map(recipes.map((x) => [x.id, x]));
  const inventoryMap = new Map(inventory.map((x) => [x.ingredient_id, x]));

  const recipeBatchCosts = new Map<string, number>();
  for (const recipe of recipes) {
    const cost = recipeLines.filter((x) => x.sub_recipe_id === recipe.id).reduce((sum, line) => {
      const ingredient = ingredientMap.get(line.ingredient_id);
      return sum + (ingredient ? ingredientLineCost(ingredient, Number(line.quantity), line.unit, conversions) : 0);
    }, 0);
    recipeBatchCosts.set(recipe.id, cost);
  }

  const menuRows = menus.map((menu) => {
    const ingredientCost = lines.filter((l) => l.menu_id === menu.id).reduce((sum, line) => {
      const ingredient = ingredientMap.get(line.ingredient_id);
      return sum + (ingredient ? ingredientLineCost(ingredient, Number(line.quantity), line.unit, conversions) : 0);
    }, 0);
    const subRecipeCost = menuRecipes.filter((l) => l.menu_id === menu.id).reduce((sum, line) => {
      const recipe = recipeMap.get(line.sub_recipe_id);
      return sum + (recipe ? recipeLineCost(recipe, recipeBatchCosts.get(recipe.id) || 0, Number(line.quantity), line.unit) : 0);
    }, 0);
    return { menu, ingredientCost, subRecipeCost, ...menuCosts(menu, ingredientCost, subRecipeCost) };
  });

  const avgFoodCost = menuRows.length ? menuRows.reduce((sum, x) => sum + x.foodCostPercent, 0) / menuRows.length : 0;
  const stockValue = ingredients.reduce((sum, ing) => {
    const qty = Number(inventoryMap.get(ing.id)?.quantity_on_hand || 0);
    const rawUnitCost = Number(ing.pack_quantity) > 0 ? Number(ing.pack_price) / Number(ing.pack_quantity) : 0;
    return sum + qty * rawUnitCost;
  }, 0);
  const lowStock = ingredients.filter((ing) => {
    const row = inventoryMap.get(ing.id);
    return row && Number(row.reorder_level) > 0 && Number(row.quantity_on_hand) <= Number(row.reorder_level);
  }).length;
  const openPO = orders.filter((x) => x.status === "DRAFT" || x.status === "ORDERED").length;

  return (
    <AppShell>
      <div className="page-head">
        <div><h1>ภาพรวม Food Cost</h1><p className="muted">ต้นทุนเมนู + สูตรย่อย + สต็อก + การสั่งซื้อในที่เดียว</p></div>
        <div className="actions"><Link href="/purchases" className="btn secondary">+ PO</Link><Link href="/menus" className="btn">+ เมนู</Link></div>
      </div>

      <section className="grid grid-4">
        <div className="card"><div className="stat-label">เมนู</div><div className="stat-value">{menus.length}</div></div>
        <div className="card"><div className="stat-label">Food Cost เฉลี่ย</div><div className="stat-value">{avgFoodCost.toFixed(1)}%</div></div>
        <div className="card"><div className="stat-label">มูลค่าสต็อก</div><div className="stat-value">{thb(stockValue)}</div></div>
        <div className="card"><div className="stat-label">PO ที่ยังไม่รับ</div><div className="stat-value">{openPO}</div></div>
      </section>

      <section className="section grid grid-4">
        <Link href="/ingredients" className="card quick-card"><div className="stat-label">วัตถุดิบ</div><div className="stat-value">{ingredients.length}</div><span className="muted">จัดการราคา/Conversion →</span></Link>
        <Link href="/recipes" className="card quick-card"><div className="stat-label">สูตรย่อย</div><div className="stat-value">{recipes.length}</div><span className="muted">ซอส/สต๊อก/ส่วนผสม →</span></Link>
        <Link href="/stock" className="card quick-card"><div className="stat-label">ควรสั่งซื้อ</div><div className="stat-value">{lowStock}</div><span className="muted">ดูสต็อก →</span></Link>
        <Link href="/prices" className="card quick-card"><div className="stat-label">Price Tracking</div><div className="stat-value">↗</div><span className="muted">ดูประวัติราคา →</span></Link>
      </section>

      <section className="section"><h2>ต้นทุนเมนู</h2><div className="table-wrap">
        {menuRows.length === 0 ? <div className="empty">ยังไม่มีเมนู</div> : <table>
          <thead><tr><th>เมนู</th><th className="number">วัตถุดิบตรง</th><th className="number">สูตรย่อย</th><th className="number">ต้นทุน/เสิร์ฟ</th><th className="number">ราคาขาย</th><th className="number">Food Cost</th><th className="number">ราคาแนะนำ</th></tr></thead>
          <tbody>{menuRows.map((row) => <tr key={row.menu.id}><td><Link href={`/menus/${row.menu.id}`}><strong>{row.menu.name}</strong></Link></td><td className="number">{thb(row.ingredientCost)}</td><td className="number">{thb(row.subRecipeCost)}</td><td className="number"><strong>{thb(row.costPerServing)}</strong></td><td className="number">{thb(row.menu.sell_price)}</td><td className="number"><span className={`badge ${row.foodCostPercent <= row.menu.target_food_cost_percent ? "good" : "warn"}`}>{row.foodCostPercent.toFixed(1)}%</span></td><td className="number">{thb(row.suggestedSellPrice)}</td></tr>)}</tbody>
        </table>}
      </div></section>
    </AppShell>
  );
}
