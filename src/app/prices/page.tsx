import { AppShell } from "@/components/app-shell";
import { addIngredientPrice } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { thb } from "@/lib/cost";
import type { Ingredient, IngredientPrice, Supplier } from "@/lib/types";

export default async function PricesPage() {
  const supabase = await createClient();
  const [{ data: ingredientsData }, { data: suppliersData }, { data: pricesData }] = await Promise.all([
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("ingredient_prices").select("*").order("recorded_at", { ascending: false }).limit(100),
  ]);
  const ingredients = (ingredientsData || []) as Ingredient[];
  const suppliers = (suppliersData || []) as Supplier[];
  const prices = (pricesData || []) as IngredientPrice[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));
  const supplierMap = new Map(suppliers.map((x) => [x.id, x]));

  return (
    <AppShell>
      <div className="page-head"><div><h1>ประวัติราคา</h1><p className="muted">ทุกการรับ PO จะบันทึกราคาเข้าหน้านี้อัตโนมัติ หรือเพิ่มเองได้</p></div></div>
      <section className="card">
        <h2>บันทึกราคาใหม่</h2>
        {ingredients.length === 0 ? <p className="muted">เพิ่มวัตถุดิบก่อน</p> : <form action={addIngredientPrice} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label>Supplier</label><select name="supplier_id"><option value="">ไม่ระบุ</option>{suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label>ปริมาณ/แพ็ก</label><input name="pack_quantity" type="number" step="0.0001" min="0.0001" defaultValue="1000" required /></div>
          <div className="field"><label>ราคา/แพ็ก</label><input name="pack_price" type="number" step="0.01" min="0" required /></div>
          <div className="field"><label>หมายเหตุ</label><input name="note" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">บันทึกราคา</button></div>
        </form>}
      </section>
      <section className="section table-wrap">
        {prices.length === 0 ? <div className="empty">ยังไม่มีประวัติราคา</div> : <table>
          <thead><tr><th>วันที่</th><th>วัตถุดิบ</th><th>Supplier</th><th className="number">ปริมาณ</th><th className="number">ราคาแพ็ก</th><th>หมายเหตุ</th></tr></thead>
          <tbody>{prices.map((p) => {
            const ing = ingredientMap.get(p.ingredient_id);
            return <tr key={p.id}><td>{new Date(p.recorded_at).toLocaleString("th-TH")}</td><td><strong>{ing?.name || "-"}</strong></td><td>{p.supplier_id ? supplierMap.get(p.supplier_id)?.name || "-" : "-"}</td><td className="number">{Number(p.pack_quantity).toLocaleString("th-TH")} {ing?.base_unit || ""}</td><td className="number">{thb(Number(p.pack_price))}</td><td>{p.note || "-"}</td></tr>;
          })}</tbody>
        </table>}
      </section>
    </AppShell>
  );
}
