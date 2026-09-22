import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { ingredientLineCost, menuCosts, thb } from "@/lib/cost";
import type { Ingredient, Menu, MenuIngredient } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [{ data: ingredientsData }, { data: menusData }, { data: linesData }] = await Promise.all([
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("menus").select("*").order("created_at", { ascending: false }),
    supabase.from("menu_ingredients").select("*"),
  ]);

  const ingredients = (ingredientsData || []) as Ingredient[];
  const menus = (menusData || []) as Menu[];
  const lines = (linesData || []) as MenuIngredient[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));

  const menuRows = menus.map((menu) => {
    const ingredientCost = lines.filter((l) => l.menu_id === menu.id).reduce((sum, line) => {
      const ingredient = ingredientMap.get(line.ingredient_id);
      return sum + (ingredient ? ingredientLineCost(ingredient, Number(line.quantity)) : 0);
    }, 0);
    return { menu, ...menuCosts(menu, ingredientCost) };
  });

  const avgFoodCost = menuRows.length
    ? menuRows.reduce((sum, x) => sum + x.foodCostPercent, 0) / menuRows.length
    : 0;
  const totalMenuCost = menuRows.reduce((sum, x) => sum + x.costPerServing, 0);

  return (
    <AppShell>
      <div className="page-head">
        <div><h1>ภาพรวมต้นทุน</h1><p className="muted">ดูต้นทุนต่อจานและ Food Cost ของทุกเมนู</p></div>
        <div className="actions"><Link href="/ingredients" className="btn secondary">+ วัตถุดิบ</Link><Link href="/menus" className="btn">+ เมนู</Link></div>
      </div>

      <section className="grid grid-4">
        <div className="card"><div className="stat-label">วัตถุดิบ</div><div className="stat-value">{ingredients.length}</div></div>
        <div className="card"><div className="stat-label">เมนูทั้งหมด</div><div className="stat-value">{menus.length}</div></div>
        <div className="card"><div className="stat-label">Food Cost เฉลี่ย</div><div className="stat-value">{avgFoodCost.toFixed(1)}%</div></div>
        <div className="card"><div className="stat-label">รวมต้นทุน/เสิร์ฟ</div><div className="stat-value">{thb(totalMenuCost)}</div></div>
      </section>

      <section className="section">
        <h2>ต้นทุนเมนู</h2>
        <div className="table-wrap">
          {menuRows.length === 0 ? <div className="empty">ยังไม่มีเมนู เริ่มจากเพิ่มวัตถุดิบและสร้างสูตรอาหาร</div> : (
            <table>
              <thead><tr><th>เมนู</th><th className="number">ต้นทุน/เสิร์ฟ</th><th className="number">ราคาขาย</th><th className="number">Food Cost</th><th className="number">ราคาขายแนะนำ</th></tr></thead>
              <tbody>{menuRows.map((row) => (
                <tr key={row.menu.id}>
                  <td><Link href={`/menus/${row.menu.id}`}><strong>{row.menu.name}</strong></Link></td>
                  <td className="number">{thb(row.costPerServing)}</td>
                  <td className="number">{thb(row.menu.sell_price)}</td>
                  <td className="number"><span className={`badge ${row.foodCostPercent <= row.menu.target_food_cost_percent ? "good" : "warn"}`}>{row.foodCostPercent.toFixed(1)}%</span></td>
                  <td className="number">{thb(row.suggestedSellPrice)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}
