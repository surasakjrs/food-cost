import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { addMenuIngredient, addMenuSubRecipe, removeMenuIngredient, removeMenuSubRecipe, updateMenu } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { ingredientLineCost, ingredientQuantityInBase, ingredientUnitCost, menuCosts, recipeLineCost, recipeUnitCost, thb } from "@/lib/cost";
import type { Ingredient, IngredientConversion, Menu, MenuIngredient, MenuSubRecipe, SubRecipe, SubRecipeIngredient } from "@/lib/types";

export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [
    { data: menuData }, { data: ingredientsData }, { data: conversionsData }, { data: linesData },
    { data: recipesData }, { data: recipeLinesData }, { data: menuRecipesData },
  ] = await Promise.all([
    supabase.from("menus").select("*").eq("id", id).single(),
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("ingredient_conversions").select("*"),
    supabase.from("menu_ingredients").select("*").eq("menu_id", id).order("created_at"),
    supabase.from("sub_recipes").select("*").order("name"),
    supabase.from("sub_recipe_ingredients").select("*"),
    supabase.from("menu_sub_recipes").select("*").eq("menu_id", id).order("created_at"),
  ]);
  if (!menuData) notFound();
  const menu = menuData as Menu;
  const ingredients = (ingredientsData || []) as Ingredient[];
  const conversions = (conversionsData || []) as IngredientConversion[];
  const lines = (linesData || []) as MenuIngredient[];
  const recipes = (recipesData || []) as SubRecipe[];
  const recipeLines = (recipeLinesData || []) as SubRecipeIngredient[];
  const menuRecipes = (menuRecipesData || []) as MenuSubRecipe[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));
  const recipeMap = new Map(recipes.map((x) => [x.id, x]));

  const recipeBatchCosts = new Map<string, number>();
  for (const recipe of recipes) {
    const cost = recipeLines.filter((x) => x.sub_recipe_id === recipe.id).reduce((sum, line) => {
      const ing = ingredientMap.get(line.ingredient_id);
      return sum + (ing ? ingredientLineCost(ing, Number(line.quantity), line.unit, conversions) : 0);
    }, 0);
    recipeBatchCosts.set(recipe.id, cost);
  }

  const directRows = lines.map((line) => {
    const ingredient = ingredientMap.get(line.ingredient_id);
    const valid = ingredient ? ingredientQuantityInBase(ingredient, Number(line.quantity), line.unit, conversions) !== null : false;
    return { line, ingredient, valid, cost: ingredient ? ingredientLineCost(ingredient, Number(line.quantity), line.unit, conversions) : 0 };
  });
  const ingredientCostTotal = directRows.reduce((sum, row) => sum + row.cost, 0);

  const subRecipeRows = menuRecipes.map((line) => {
    const recipe = recipeMap.get(line.sub_recipe_id);
    const batchCost = recipe ? recipeBatchCosts.get(recipe.id) || 0 : 0;
    const cost = recipe ? recipeLineCost(recipe, batchCost, Number(line.quantity), line.unit) : 0;
    return { line, recipe, batchCost, cost };
  });
  const subRecipeCostTotal = subRecipeRows.reduce((sum, row) => sum + row.cost, 0);
  const costs = menuCosts(menu, ingredientCostTotal, subRecipeCostTotal);

  return (
    <AppShell>
      <div className="page-head"><div><h1>{menu.name}</h1><p className="muted">คำนวณจากวัตถุดิบตรง + สูตรย่อย + Packaging + Overhead</p></div></div>
      <section className="cost-hero">
        <div className="card"><div className="stat-label">ต้นทุนต่อเสิร์ฟ</div><div className="cost-big">{thb(costs.costPerServing)}</div><div className="muted">ต้นทุนทั้งสูตร {thb(costs.batchCost)} · {menu.servings} เสิร์ฟ</div><div className="grid grid-2" style={{ marginTop: 18 }}><div><div className="stat-label">Food Cost</div><div className="stat-value">{costs.foodCostPercent.toFixed(1)}%</div></div><div><div className="stat-label">กำไรขั้นต้น/เสิร์ฟ</div><div className="stat-value">{thb(costs.grossProfitPerServing)}</div></div></div></div>
        <div className="card"><div className="stat-label">ราคาขายแนะนำ</div><div className="cost-big">{thb(costs.suggestedSellPrice)}</div><p className="muted">Food Cost เป้าหมาย {menu.target_food_cost_percent}%</p><div className={`badge ${costs.foodCostPercent <= menu.target_food_cost_percent ? "good" : "warn"}`}>{costs.foodCostPercent <= menu.target_food_cost_percent ? "อยู่ในเป้าหมาย" : "ต้นทุนสูงกว่าเป้าหมาย"}</div></div>
      </section>

      <section className="section grid grid-2">
        <div className="card"><div className="stat-label">วัตถุดิบตรง</div><div className="stat-value">{thb(ingredientCostTotal)}</div></div>
        <div className="card"><div className="stat-label">สูตรย่อย</div><div className="stat-value">{thb(subRecipeCostTotal)}</div></div>
      </section>

      <section className="section card"><h2>ข้อมูลเมนู</h2><form action={updateMenu} className="form-grid">
        <input type="hidden" name="id" value={menu.id} />
        <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อเมนู</label><input name="name" defaultValue={menu.name} required /></div>
        <div className="field"><label>จำนวนเสิร์ฟ/สูตร</label><input name="servings" type="number" min="1" defaultValue={menu.servings} /></div>
        <div className="field"><label>ราคาขาย/เสิร์ฟ</label><input name="sell_price" type="number" step="0.01" min="0" defaultValue={menu.sell_price} /></div>
        <div className="field"><label>ค่าแพ็กเกจ/สูตร</label><input name="packaging_cost" type="number" step="0.01" min="0" defaultValue={menu.packaging_cost} /></div>
        <div className="field"><label>ค่าใช้จ่ายอื่น/สูตร</label><input name="overhead_cost" type="number" step="0.01" min="0" defaultValue={menu.overhead_cost} /></div>
        <div className="field"><label>Food Cost เป้าหมาย (%)</label><input name="target_food_cost_percent" type="number" step="0.1" min="1" max="100" defaultValue={menu.target_food_cost_percent} /></div>
        <div className="field" style={{ justifyContent: "end" }}><button className="btn">บันทึก</button></div>
      </form></section>

      <section className="section card"><h2>เพิ่มวัตถุดิบตรง</h2>{ingredients.length === 0 ? <p className="muted">เพิ่มวัตถุดิบก่อน</p> : <form action={addMenuIngredient} className="inline-form inline-form-4">
        <input type="hidden" name="menu_id" value={menu.id} />
        <div className="field"><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.base_unit})</option>)}</select></div>
        <div className="field"><label>จำนวน</label><input name="quantity" type="number" min="0.0001" step="0.01" defaultValue="100" /></div>
        <div className="field"><label>หน่วย</label><input name="unit" defaultValue="g" placeholder="g, kg, ml, l, tbsp..." /></div>
        <button className="btn">เพิ่ม / อัปเดต</button>
      </form>}</section>

      <section className="section card"><h2>เพิ่มสูตรย่อย</h2>{recipes.length === 0 ? <p className="muted">สร้างสูตรย่อยก่อน</p> : <form action={addMenuSubRecipe} className="inline-form inline-form-4">
        <input type="hidden" name="menu_id" value={menu.id} />
        <div className="field"><label>สูตรย่อย</label><select name="sub_recipe_id">{recipes.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.output_unit})</option>)}</select></div>
        <div className="field"><label>จำนวน</label><input name="quantity" type="number" min="0.0001" step="0.01" defaultValue="50" /></div>
        <div className="field"><label>หน่วย</label><input name="unit" defaultValue="g" placeholder="g, kg, ml, l, pcs" /></div>
        <button className="btn">เพิ่ม / อัปเดต</button>
      </form>}</section>

      <section className="section"><h2>วัตถุดิบตรงในเมนู</h2><div className="table-wrap">{directRows.length === 0 ? <div className="empty">ยังไม่มีวัตถุดิบตรง</div> : <table><thead><tr><th>วัตถุดิบ</th><th className="number">จำนวนใช้</th><th>หน่วย</th><th className="number">ต้นทุน/หน่วยหลัก</th><th className="number">ต้นทุน</th><th></th></tr></thead><tbody>{directRows.map(({ line, ingredient, valid, cost }) => <tr key={line.id}><td><strong>{ingredient?.name || "-"}</strong></td><td className="number">{Number(line.quantity).toLocaleString("th-TH")} {line.unit}</td><td>{valid ? <span className="badge good">แปลงได้</span> : <span className="badge warn">ไม่พบ conversion</span>}</td><td className="number">{ingredient ? `${thb(ingredientUnitCost(ingredient))}/${ingredient.base_unit}` : "-"}</td><td className="number">{thb(cost)}</td><td className="number"><form action={removeMenuIngredient}><input type="hidden" name="id" value={line.id} /><input type="hidden" name="menu_id" value={menu.id} /><button className="btn danger small">ลบ</button></form></td></tr>)}</tbody><tfoot><tr><td colSpan={4}><strong>รวมวัตถุดิบตรง</strong></td><td className="number"><strong>{thb(ingredientCostTotal)}</strong></td><td /></tr></tfoot></table>}</div></section>

      <section className="section"><h2>สูตรย่อยในเมนู</h2><div className="table-wrap">{subRecipeRows.length === 0 ? <div className="empty">ยังไม่มีสูตรย่อย</div> : <table><thead><tr><th>สูตรย่อย</th><th className="number">จำนวนใช้</th><th className="number">ต้นทุน/{"หน่วย"}</th><th className="number">ต้นทุน</th><th></th></tr></thead><tbody>{subRecipeRows.map(({ line, recipe, batchCost, cost }) => <tr key={line.id}><td><strong>{recipe?.name || "-"}</strong></td><td className="number">{Number(line.quantity).toLocaleString("th-TH")} {line.unit}</td><td className="number">{recipe ? `${thb(recipeUnitCost(recipe, batchCost))}/${recipe.output_unit}` : "-"}</td><td className="number">{thb(cost)}</td><td className="number"><form action={removeMenuSubRecipe}><input type="hidden" name="id" value={line.id} /><input type="hidden" name="menu_id" value={menu.id} /><button className="btn danger small">ลบ</button></form></td></tr>)}</tbody><tfoot><tr><td colSpan={3}><strong>รวมสูตรย่อย</strong></td><td className="number"><strong>{thb(subRecipeCostTotal)}</strong></td><td /></tr></tfoot></table>}</div></section>
    </AppShell>
  );
}
