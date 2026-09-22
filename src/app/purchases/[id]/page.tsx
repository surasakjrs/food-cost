import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { addPurchaseOrderItem, receivePurchaseOrder, removePurchaseOrderItem, setPurchaseOrderStatus } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { thb } from "@/lib/cost";
import type { Ingredient, PurchaseOrder, PurchaseOrderItem, Supplier } from "@/lib/types";

const statusText: Record<string, string> = { DRAFT: "ร่าง", ORDERED: "สั่งแล้ว", RECEIVED: "รับแล้ว", CANCELLED: "ยกเลิก" };

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: poData }, { data: itemsData }, { data: ingredientsData }, { data: suppliersData }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("purchase_order_items").select("*").eq("purchase_order_id", id).order("created_at"),
    supabase.from("ingredients").select("*").order("name"),
    supabase.from("suppliers").select("*").order("name"),
  ]);
  if (!poData) notFound();
  const po = poData as PurchaseOrder;
  const items = (itemsData || []) as PurchaseOrderItem[];
  const ingredients = (ingredientsData || []) as Ingredient[];
  const suppliers = (suppliersData || []) as Supplier[];
  const ingredientMap = new Map(ingredients.map((x) => [x.id, x]));
  const supplierMap = new Map(suppliers.map((x) => [x.id, x]));
  const total = items.reduce((sum, x) => sum + Number(x.quantity_packs) * Number(x.unit_pack_price), 0);
  const editable = po.status === "DRAFT";

  return (
    <AppShell>
      <div className="page-head"><div><h1>{po.po_number}</h1><p className="muted">{po.supplier_id ? supplierMap.get(po.supplier_id)?.name || "Supplier" : "ไม่ระบุ Supplier"} · <span className="badge">{statusText[po.status]}</span></p></div><div className="actions">
        {po.status === "DRAFT" && <form action={setPurchaseOrderStatus}><input type="hidden" name="id" value={po.id} /><input type="hidden" name="status" value="ORDERED" /><button className="btn secondary">ทำเครื่องหมายว่าสั่งแล้ว</button></form>}
        {(po.status === "DRAFT" || po.status === "ORDERED") && items.length > 0 && <form action={receivePurchaseOrder}><input type="hidden" name="id" value={po.id} /><button className="btn">รับสินค้าเข้าสต็อก</button></form>}
        {(po.status === "DRAFT" || po.status === "ORDERED") && <form action={setPurchaseOrderStatus}><input type="hidden" name="id" value={po.id} /><input type="hidden" name="status" value="CANCELLED" /><button className="btn danger">ยกเลิก</button></form>}
      </div></div>

      <section className="grid grid-4">
        <div className="card"><div className="stat-label">สถานะ</div><div className="stat-value status-value">{statusText[po.status]}</div></div>
        <div className="card"><div className="stat-label">รายการ</div><div className="stat-value">{items.length}</div></div>
        <div className="card"><div className="stat-label">ยอดรวม</div><div className="stat-value">{thb(total)}</div></div>
        <div className="card"><div className="stat-label">รับสินค้า</div><div className="stat-value status-value">{po.received_at ? new Date(po.received_at).toLocaleDateString("th-TH") : "-"}</div></div>
      </section>

      {editable && <section className="section card">
        <h2>เพิ่มรายการ</h2>
        {ingredients.length === 0 ? <p className="muted">เพิ่มวัตถุดิบก่อน</p> : <form action={addPurchaseOrderItem} className="form-grid">
          <input type="hidden" name="purchase_order_id" value={po.id} />
          <div className="field" style={{ gridColumn: "span 2" }}><label>วัตถุดิบ</label><select name="ingredient_id">{ingredients.map((x) => <option key={x.id} value={x.id}>{x.name} · ปัจจุบัน {x.pack_quantity} {x.base_unit}/{thb(x.pack_price)}</option>)}</select></div>
          <div className="field"><label>จำนวนแพ็ก</label><input name="quantity_packs" type="number" min="0.0001" step="0.01" defaultValue="1" /></div>
          <div className="field"><label>ปริมาณต่อแพ็ก</label><input name="pack_quantity" type="number" min="0.0001" step="0.01" defaultValue="1000" /></div>
          <div className="field"><label>ราคา/แพ็ก</label><input name="unit_pack_price" type="number" min="0" step="0.01" required /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">เพิ่ม / อัปเดต</button></div>
        </form>}
      </section>}

      <section className="section table-wrap">
        {items.length === 0 ? <div className="empty">ยังไม่มีรายการใน PO</div> : <table>
          <thead><tr><th>วัตถุดิบ</th><th className="number">จำนวนแพ็ก</th><th className="number">ขนาดแพ็ก</th><th className="number">ราคา/แพ็ก</th><th className="number">รวม</th><th></th></tr></thead>
          <tbody>{items.map((line) => { const ing = ingredientMap.get(line.ingredient_id); return <tr key={line.id}><td><strong>{ing?.name || "-"}</strong></td><td className="number">{Number(line.quantity_packs).toLocaleString("th-TH")}</td><td className="number">{Number(line.pack_quantity).toLocaleString("th-TH")} {ing?.base_unit || ""}</td><td className="number">{thb(Number(line.unit_pack_price))}</td><td className="number">{thb(Number(line.quantity_packs) * Number(line.unit_pack_price))}</td><td className="number">{editable && <form action={removePurchaseOrderItem}><input type="hidden" name="id" value={line.id} /><input type="hidden" name="purchase_order_id" value={po.id} /><button className="btn danger small">ลบ</button></form>}</td></tr>; })}</tbody>
          <tfoot><tr><td colSpan={4}><strong>ยอดรวม PO</strong></td><td className="number"><strong>{thb(total)}</strong></td><td /></tr></tfoot>
        </table>}
      </section>
      {po.status === "RECEIVED" && <div className="success section">รับสินค้าแล้ว: Stock, Price History และราคาปัจจุบันของวัตถุดิบถูกอัปเดตจาก PO นี้แล้ว</div>}
    </AppShell>
  );
}
