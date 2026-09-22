import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { addMenuIngredient, removeMenuIngredient, updateMenu } from "@/app/actions";
import { ingredientLineCost, ingredientUnitCost, menuCosts, thb } from "@/lib/cost";
import type { Ingredient, Menu, MenuIngredient } from "@/lib/types";

export default async function MenuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: menuData }, { data: ingredientsData }, { data: linesData }] = await Promise.all([
    supabase.from("menus").select("*").eq("id", id).single(),
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("menu_ingredients").select("*").eq("menu_id", id).order("created_at"),
  ]);

  if (!menuData) notFound();
  const menu = menuData as Menu;
  const ingredients = (ingredientsData || []) as Ingredient[];
  const lines = (linesData || []) as MenuIngredient[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));

  const lineRows = lines.map((line) => {
    const ingredient = ingredientMap.get(line.ingredient_id);
    return {
      line,
      ingredient,
      cost: ingredient ? ingredientLineCost(ingredient, Number(line.quantity)) : 0,
    };
  });
  const ingredientCostTotal = lineRows.reduce((sum, row) => sum + row.cost, 0);
  const costs = menuCosts(menu, ingredientCostTotal);

  return (
    <AppShell>
      <div className="page-head">
        <div><h1>{menu.name}</h1><p className="muted">แก้สูตรและดูต้นทุนแบบ Real-time จากข้อมูลล่าสุดในฐานข้อมูล</p></div>
      </div>

      <section className="cost-hero">
        <div className="card">
          <div className="stat-label">ต้นทุนต่อเสิร์ฟ</div>
          <div className="cost-big">{thb(costs.costPerServing)}</div>
          <div className="muted">ต้นทุนทั้งสูตร {thb(costs.batchCost)} · {menu.servings} เสิร์ฟ</div>
          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div><div className="stat-label">Food Cost</div><div className="stat-value">{costs.foodCostPercent.toFixed(1)}%</div></div>
            <div><div className="stat-label">กำไรขั้นต้น/เสิร์ฟ</div><div className="stat-value">{thb(costs.grossProfitPerServing)}</div></div>
          </div>
        </div>
        <div className="card">
          <div className="stat-label">ราคาขายแนะนำ</div>
          <div className="cost-big">{thb(costs.suggestedSellPrice)}</div>
          <p className="muted">คำนวณจาก Food Cost เป้าหมาย {menu.target_food_cost_percent}%</p>
          <div className={`badge ${costs.foodCostPercent <= menu.target_food_cost_percent ? "good" : "warn"}`}>
            {costs.foodCostPercent <= menu.target_food_cost_percent ? "อยู่ในเป้าหมาย" : "ต้นทุนสูงกว่าเป้าหมาย"}
          </div>
        </div>
      </section>

      <section className="section card">
        <h2>ข้อมูลเมนู</h2>
        <form action={updateMenu} className="form-grid">
          <input type="hidden" name="id" value={menu.id} />
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อเมนู</label><input name="name" defaultValue={menu.name} required /></div>
          <div className="field"><label>จำนวนเสิร์ฟ/สูตร</label><input name="servings" type="number" min="1" defaultValue={menu.servings} /></div>
          <div className="field"><label>ราคาขาย/เสิร์ฟ</label><input name="sell_price" type="number" step="0.01" min="0" defaultValue={menu.sell_price} /></div>
          <div className="field"><label>ค่าแพ็กเกจ/สูตร</label><input name="packaging_cost" type="number" step="0.01" min="0" defaultValue={menu.packaging_cost} /></div>
          <div className="field"><label>ค่าใช้จ่ายอื่น/สูตร</label><input name="overhead_cost" type="number" step="0.01" min="0" defaultValue={menu.overhead_cost} /></div>
          <div className="field"><label>Food Cost เป้าหมาย (%)</label><input name="target_food_cost_percent" type="number" step="0.1" min="1" max="100" defaultValue={menu.target_food_cost_percent} /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">บันทึก</button></div>
        </form>
      </section>

      <section className="section card">
        <h2>เพิ่มวัตถุดิบในสูตร</h2>
        {ingredients.length === 0 ? <p className="muted">กรุณาเพิ่มวัตถุดิบก่อน</p> : (
          <form action={addMenuIngredient} className="inline-form">
            <input type="hidden" name="menu_id" value={menu.id} />
            <div className="field"><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.base_unit})</option>)}</select></div>
            <div className="field"><label>จำนวนที่ใช้</label><input name="quantity" type="number" min="0.0001" step="0.01" defaultValue="100" required /></div>
            <button className="btn">เพิ่ม / อัปเดต</button>
          </form>
        )}
      </section>

      <section className="section">
        <h2>สูตรอาหาร</h2>
        <div className="table-wrap">
          {lineRows.length === 0 ? <div className="empty">ยังไม่มีวัตถุดิบในสูตร</div> : (
            <table>
              <thead><tr><th>วัตถุดิบ</th><th className="number">จำนวนใช้</th><th className="number">ต้นทุน/หน่วย</th><th className="number">ต้นทุนในสูตร</th><th></th></tr></thead>
              <tbody>
                {lineRows.map(({ line, ingredient, cost }) => (
                  <tr key={line.id}>
                    <td><strong>{ingredient?.name || "วัตถุดิบถูกลบ"}</strong></td>
                    <td className="number">{Number(line.quantity).toLocaleString("th-TH")} {ingredient?.base_unit || ""}</td>
                    <td className="number">{ingredient ? `${thb(ingredientUnitCost(ingredient))}/${ingredient.base_unit}` : "-"}</td>
                    <td className="number">{thb(cost)}</td>
                    <td className="number"><form action={removeMenuIngredient}><input type="hidden" name="id" value={line.id} /><input type="hidden" name="menu_id" value={menu.id} /><button className="btn danger small">ลบ</button></form></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3}><strong>รวมวัตถุดิบ</strong></td><td className="number"><strong>{thb(ingredientCostTotal)}</strong></td><td /></tr></tfoot>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}
