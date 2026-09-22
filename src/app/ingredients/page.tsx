import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { addIngredient, deleteIngredient } from "@/app/actions";
import { ingredientUnitCost, thb } from "@/lib/cost";
import type { Ingredient } from "@/lib/types";

export default async function IngredientsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("ingredients").select("*").order("name");
  const ingredients = (data || []) as Ingredient[];

  return (
    <AppShell>
      <div className="page-head"><div><h1>วัตถุดิบ</h1><p className="muted">เก็บราคาซื้อ ปริมาณต่อแพ็ก และ % ที่ใช้ได้จริง</p></div></div>

      <section className="card">
        <h2>เพิ่มวัตถุดิบ</h2>
        <form action={addIngredient} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อวัตถุดิบ</label><input name="name" placeholder="เช่น สันคอหมู" required /></div>
          <div className="field"><label>หมวดหมู่</label><input name="category" placeholder="เนื้อสัตว์" /></div>
          <div className="field"><label>หน่วยหลัก</label><select name="base_unit" defaultValue="g"><option value="g">กรัม (g)</option><option value="ml">มิลลิลิตร (ml)</option><option value="pcs">ชิ้น (pcs)</option></select></div>
          <div className="field"><label>ปริมาณต่อแพ็ก</label><input name="pack_quantity" type="number" step="0.01" min="0.01" defaultValue="1000" required /></div>
          <div className="field"><label>ราคาแพ็ก (บาท)</label><input name="pack_price" type="number" step="0.01" min="0" placeholder="180" required /></div>
          <div className="field"><label>ใช้ได้จริง (%)</label><input name="yield_percent" type="number" step="0.1" min="1" max="100" defaultValue="100" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn" type="submit">เพิ่มวัตถุดิบ</button></div>
        </form>
        <p className="note" style={{ margin: "10px 0 0" }}>ตัวอย่าง: หมู 1,000 g ราคา 180 บาท ถ้าตัดแต่งแล้วใช้ได้ 90% ให้ใส่ Yield = 90</p>
      </section>

      <section className="section">
        <div className="table-wrap">
          {ingredients.length === 0 ? <div className="empty">ยังไม่มีวัตถุดิบ</div> : (
            <table>
              <thead><tr><th>วัตถุดิบ</th><th>หมวด</th><th className="number">ราคาแพ็ก</th><th className="number">ปริมาณ</th><th className="number">Yield</th><th className="number">ต้นทุน/หน่วย</th><th></th></tr></thead>
              <tbody>{ingredients.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category || "-"}</td>
                  <td className="number">{thb(item.pack_price)}</td>
                  <td className="number">{Number(item.pack_quantity).toLocaleString("th-TH")} {item.base_unit}</td>
                  <td className="number">{item.yield_percent}%</td>
                  <td className="number">{thb(ingredientUnitCost(item))}/{item.base_unit}</td>
                  <td className="number"><form action={deleteIngredient}><input type="hidden" name="id" value={item.id} /><button className="btn danger small">ลบ</button></form></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}
