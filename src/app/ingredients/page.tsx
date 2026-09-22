import { AppShell } from "@/components/app-shell";
import { addIngredient, addIngredientConversion, deleteIngredient, deleteIngredientConversion } from "@/app/actions";
import { ingredientUnitCost, thb } from "@/lib/cost";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, IngredientConversion } from "@/lib/types";

export default async function IngredientsPage() {
  const supabase = await createClient();
  const [{ data: ingredientsData }, { data: conversionsData }] = await Promise.all([
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("ingredient_conversions").select("*").order("unit_name"),
  ]);
  const ingredients = (ingredientsData || []) as Ingredient[];
  const conversions = (conversionsData || []) as IngredientConversion[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));

  return (
    <AppShell>
      <div className="page-head"><div><h1>วัตถุดิบ</h1><p className="muted">ราคาปัจจุบัน, Yield และการแปลงหน่วยเฉพาะวัตถุดิบ</p></div></div>
      <section className="card">
        <h2>เพิ่มวัตถุดิบ</h2>
        <form action={addIngredient} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อวัตถุดิบ</label><input name="name" placeholder="เช่น สันคอหมู" required /></div>
          <div className="field"><label>หมวดหมู่</label><input name="category" placeholder="เนื้อสัตว์" /></div>
          <div className="field"><label>หน่วยหลัก</label><select name="base_unit" defaultValue="g"><option value="g">กรัม (g)</option><option value="ml">มิลลิลิตร (ml)</option><option value="pcs">ชิ้น (pcs)</option></select></div>
          <div className="field"><label>ปริมาณต่อแพ็ก</label><input name="pack_quantity" type="number" step="0.01" min="0.01" defaultValue="1000" required /></div>
          <div className="field"><label>ราคาแพ็ก (บาท)</label><input name="pack_price" type="number" step="0.01" min="0" required /></div>
          <div className="field"><label>ใช้ได้จริง (%)</label><input name="yield_percent" type="number" step="0.1" min="1" max="100" defaultValue="100" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">เพิ่มวัตถุดิบ</button></div>
        </form>
      </section>

      <section className="section table-wrap">
        {ingredients.length === 0 ? <div className="empty">ยังไม่มีวัตถุดิบ</div> : <table>
          <thead><tr><th>วัตถุดิบ</th><th>หมวด</th><th className="number">ราคาแพ็ก</th><th className="number">ปริมาณ</th><th className="number">Yield</th><th className="number">ต้นทุน/หน่วย</th><th></th></tr></thead>
          <tbody>{ingredients.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.category || "-"}</td><td className="number">{thb(item.pack_price)}</td><td className="number">{Number(item.pack_quantity).toLocaleString("th-TH")} {item.base_unit}</td><td className="number">{item.yield_percent}%</td><td className="number">{thb(ingredientUnitCost(item))}/{item.base_unit}</td><td className="number"><form action={deleteIngredient}><input type="hidden" name="id" value={item.id} /><button className="btn danger small">ลบ</button></form></td></tr>)}</tbody>
        </table>}
      </section>

      <section className="section card">
        <h2>Unit Conversion กำหนดเอง</h2>
        <p className="muted">ใช้เมื่อหน่วยไม่ใช่มาตรฐาน เช่น 1 tbsp ซอส = 15 ml หรือ 1 ลูก = 80 g</p>
        {ingredients.length === 0 ? <p className="muted">เพิ่มวัตถุดิบก่อน</p> : <form action={addIngredientConversion} className="inline-form inline-form-4">
          <div className="field"><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.base_unit})</option>)}</select></div>
          <div className="field"><label>ชื่อหน่วย</label><input name="unit_name" placeholder="tbsp" required /></div>
          <div className="field"><label>1 หน่วย = กี่หน่วยหลัก</label><input name="base_quantity" type="number" min="0.000001" step="0.000001" placeholder="15" required /></div>
          <button className="btn">บันทึก Conversion</button>
        </form>}
      </section>

      <section className="section table-wrap">
        {conversions.length === 0 ? <div className="empty">ยังไม่มี custom conversion</div> : <table>
          <thead><tr><th>วัตถุดิบ</th><th>หน่วยกำหนดเอง</th><th className="number">เท่ากับหน่วยหลัก</th><th></th></tr></thead>
          <tbody>{conversions.map((c) => { const ing = ingredientMap.get(c.ingredient_id); return <tr key={c.id}><td>{ing?.name || "-"}</td><td><strong>1 {c.unit_name}</strong></td><td className="number">{Number(c.base_quantity).toLocaleString("th-TH")} {ing?.base_unit || ""}</td><td className="number"><form action={deleteIngredientConversion}><input type="hidden" name="id" value={c.id} /><button className="btn danger small">ลบ</button></form></td></tr>; })}</tbody>
        </table>}
      </section>
    </AppShell>
  );
}
