import { AppShell } from "@/components/app-shell";
import { adjustStock, setReorderLevel } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { fmtNumber, thb } from "@/lib/cost";
import type { Ingredient, Inventory, StockMovement } from "@/lib/types";

export default async function StockPage() {
  const supabase = await createClient();
  const [{ data: ingredientsData }, { data: inventoryData }, { data: movementsData }] = await Promise.all([
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("inventory").select("*"),
    supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(40),
  ]);
  const ingredients = (ingredientsData || []) as Ingredient[];
  const inventory = (inventoryData || []) as Inventory[];
  const movements = (movementsData || []) as StockMovement[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));
  const inventoryMap = new Map(inventory.map((x) => [x.ingredient_id, x]));
  const totalValue = ingredients.reduce((sum, ing) => {
    const qty = Number(inventoryMap.get(ing.id)?.quantity_on_hand || 0);
    const rawUnitCost = Number(ing.pack_quantity) > 0 ? Number(ing.pack_price) / Number(ing.pack_quantity) : 0;
    return sum + qty * rawUnitCost;
  }, 0);
  const lowStock = ingredients.filter((ing) => {
    const row = inventoryMap.get(ing.id);
    return row && Number(row.reorder_level) > 0 && Number(row.quantity_on_hand) <= Number(row.reorder_level);
  }).length;

  return (
    <AppShell>
      <div className="page-head"><div><h1>สต็อกวัตถุดิบ</h1><p className="muted">สต็อกเก็บเป็นหน่วยหลักของวัตถุดิบ และเพิ่มอัตโนมัติเมื่อรับ PO</p></div></div>
      <section className="grid grid-4">
        <div className="card"><div className="stat-label">วัตถุดิบทั้งหมด</div><div className="stat-value">{ingredients.length}</div></div>
        <div className="card"><div className="stat-label">มีรายการสต็อก</div><div className="stat-value">{inventory.length}</div></div>
        <div className="card"><div className="stat-label">ถึงจุดสั่งซื้อ</div><div className="stat-value">{lowStock}</div></div>
        <div className="card"><div className="stat-label">มูลค่าสต็อกโดยประมาณ</div><div className="stat-value">{thb(totalValue)}</div></div>
      </section>

      <section className="section card">
        <h2>ปรับสต็อก</h2>
        {ingredients.length === 0 ? <p className="muted">เพิ่มวัตถุดิบก่อน</p> : <form action={adjustStock} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.base_unit})</option>)}</select></div>
          <div className="field"><label>จำนวน +/-</label><input name="quantity_delta" type="number" step="0.01" placeholder="เช่น 500 หรือ -100" required /></div>
          <div className="field"><label>ประเภท</label><select name="kind"><option value="ADJUSTMENT">ปรับยอด</option><option value="USAGE">ใช้ไป</option><option value="WASTE">สูญเสีย</option><option value="RETURN">คืนสินค้า</option></select></div>
          <div className="field" style={{ gridColumn: "span 2" }}><label>หมายเหตุ</label><input name="note" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">บันทึก</button></div>
        </form>}
      </section>

      <section className="section table-wrap">
        {ingredients.length === 0 ? <div className="empty">ยังไม่มีวัตถุดิบ</div> : <table>
          <thead><tr><th>วัตถุดิบ</th><th className="number">คงเหลือ</th><th className="number">จุดสั่งซื้อ</th><th>สถานะ</th><th>ตั้งจุดสั่งซื้อ</th></tr></thead>
          <tbody>{ingredients.map((ing) => {
            const row = inventoryMap.get(ing.id);
            const qty = Number(row?.quantity_on_hand || 0);
            const reorder = Number(row?.reorder_level || 0);
            const low = reorder > 0 && qty <= reorder;
            return <tr key={ing.id}><td><strong>{ing.name}</strong></td><td className="number">{fmtNumber(qty, 4)} {ing.base_unit}</td><td className="number">{fmtNumber(reorder, 4)} {ing.base_unit}</td><td>{low ? <span className="badge warn">ควรสั่งซื้อ</span> : <span className="badge good">ปกติ</span>}</td><td><form action={setReorderLevel} className="mini-form"><input type="hidden" name="ingredient_id" value={ing.id} /><input name="reorder_level" type="number" min="0" step="0.01" defaultValue={reorder} /><button className="btn secondary small">บันทึก</button></form></td></tr>;
          })}</tbody>
        </table>}
      </section>

      <section className="section"><h2>Stock Movement ล่าสุด</h2><div className="table-wrap">
        {movements.length === 0 ? <div className="empty">ยังไม่มี movement</div> : <table><thead><tr><th>เวลา</th><th>วัตถุดิบ</th><th>ประเภท</th><th className="number">จำนวน</th><th>หมายเหตุ</th></tr></thead><tbody>{movements.map((m) => { const ing = ingredientMap.get(m.ingredient_id); return <tr key={m.id}><td>{new Date(m.created_at).toLocaleString("th-TH")}</td><td>{ing?.name || "-"}</td><td><span className="badge">{m.kind}</span></td><td className="number">{Number(m.quantity_delta) > 0 ? "+" : ""}{fmtNumber(Number(m.quantity_delta), 4)} {ing?.base_unit || ""}</td><td>{m.note || "-"}</td></tr>; })}</tbody></table>}
      </div></section>
    </AppShell>
  );
}
