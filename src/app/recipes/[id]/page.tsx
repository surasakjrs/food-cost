import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { addSubRecipeIngredient, removeSubRecipeIngredient, updateSubRecipe } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { ingredientLineCost, ingredientQuantityInBase, recipeUnitCost, recipeUsableOutput, thb } from "@/lib/cost";
import type { Ingredient, IngredientConversion, SubRecipe, SubRecipeIngredient } from "@/lib/types";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: recipeData }, { data: ingredientsData }, { data: conversionsData }, { data: linesData }] = await Promise.all([
    supabase.from("sub_recipes").select("*").eq("id", id).single(),
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("ingredient_conversions").select("*"),
    supabase.from("sub_recipe_ingredients").select("*").eq("sub_recipe_id", id).order("created_at"),
  ]);
  if (!recipeData) notFound();

  const recipe = recipeData as SubRecipe;
  const ingredients = (ingredientsData || []) as Ingredient[];
  const conversions = (conversionsData || []) as IngredientConversion[];
  const lines = (linesData || []) as SubRecipeIngredient[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));
  const rows = lines.map((line) => {
    const ingredient = ingredientMap.get(line.ingredient_id);
    const validQuantity = ingredient ? ingredientQuantityInBase(ingredient, Number(line.quantity), line.unit, conversions) : null;
    const cost = ingredient ? ingredientLineCost(ingredient, Number(line.quantity), line.unit, conversions) : 0;
    return { line, ingredient, cost, validQuantity };
  });
  const batchCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const unitCost = recipeUnitCost(recipe, batchCost);

  return (
    <AppShell>
      <div className="page-head"><div><h1>{recipe.name}</h1><p className="muted">ต้นทุนสูตรย่อยจะถูกนำไปใช้ในเมนูหลักตามปริมาณที่ใช้</p></div></div>
      <section className="cost-hero">
        <div className="card"><div className="stat-label">ต้นทุนทั้งสูตร</div><div className="cost-big">{thb(batchCost)}</div><div className="muted">ผลผลิตใช้ได้จริง {recipeUsableOutput(recipe).toLocaleString("th-TH")} {recipe.output_unit}</div></div>
        <div className="card"><div className="stat-label">ต้นทุนต่อ {recipe.output_unit}</div><div className="cost-big">{thb(unitCost)}</div><div className="muted">คำนวณหลัง Yield {recipe.yield_percent}%</div></div>
      </section>

      <section className="section card">
        <h2>ข้อมูลสูตรย่อย</h2>
        <form action={updateSubRecipe} className="form-grid">
          <input type="hidden" name="id" value={recipe.id} />
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อสูตร</label><input name="name" defaultValue={recipe.name} required /></div>
          <div className="field"><label>ผลผลิต</label><input name="output_quantity" type="number" step="0.01" min="0.01" defaultValue={recipe.output_quantity} /></div>
          <div className="field"><label>หน่วยผลผลิต</label><select name="output_unit" defaultValue={recipe.output_unit}><option value="g">g</option><option value="ml">ml</option><option value="pcs">pcs</option></select></div>
          <div className="field"><label>Yield (%)</label><input name="yield_percent" type="number" min="1" max="100" step="0.1" defaultValue={recipe.yield_percent} /></div>
          <div className="field"><label>หมายเหตุ</label><input name="notes" defaultValue={recipe.notes || ""} /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">บันทึก</button></div>
        </form>
      </section>

      <section className="section card">
        <h2>เพิ่มวัตถุดิบในสูตร</h2>
        {ingredients.length === 0 ? <p className="muted">เพิ่มวัตถุดิบก่อน</p> : <form action={addSubRecipeIngredient} className="inline-form inline-form-4">
          <input type="hidden" name="sub_recipe_id" value={recipe.id} />
          <div className="field"><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.base_unit})</option>)}</select></div>
          <div className="field"><label>จำนวน</label><input name="quantity" type="number" min="0.0001" step="0.01" defaultValue="100" /></div>
          <div className="field"><label>หน่วย</label><input name="unit" defaultValue="g" placeholder="g, kg, ml, l, tbsp..." /></div>
          <button className="btn">เพิ่ม / อัปเดต</button>
        </form>}
        <p className="note" style={{ marginTop: 10 }}>หน่วยมาตรฐานรองรับ g/kg/mg, ml/l, pcs และหน่วยกำหนดเองจากหน้าวัตถุดิบ</p>
      </section>

      <section className="section table-wrap">
        {rows.length === 0 ? <div className="empty">ยังไม่มีวัตถุดิบในสูตร</div> : <table>
          <thead><tr><th>วัตถุดิบ</th><th className="number">จำนวนใช้</th><th>สถานะหน่วย</th><th className="number">ต้นทุน</th><th></th></tr></thead>
          <tbody>{rows.map(({ line, ingredient, cost, validQuantity }) => <tr key={line.id}>
            <td><strong>{ingredient?.name || "-"}</strong></td>
            <td className="number">{Number(line.quantity).toLocaleString("th-TH")} {line.unit}</td>
            <td>{validQuantity === null ? <span className="badge warn">ไม่พบ conversion</span> : <span className="badge good">พร้อมคำนวณ</span>}</td>
            <td className="number">{thb(cost)}</td>
            <td className="number"><form action={removeSubRecipeIngredient}><input type="hidden" name="id" value={line.id} /><input type="hidden" name="sub_recipe_id" value={recipe.id} /><button className="btn danger small">ลบ</button></form></td>
          </tr>)}</tbody>
          <tfoot><tr><td colSpan={3}><strong>รวมต้นทุนวัตถุดิบ</strong></td><td className="number"><strong>{thb(batchCost)}</strong></td><td /></tr></tfoot>
        </table>}
      </section>
    </AppShell>
  );
}
