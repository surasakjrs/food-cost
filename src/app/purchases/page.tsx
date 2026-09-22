import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createPurchaseOrder } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { PurchaseOrder, Supplier } from "@/lib/types";

const statusText: Record<string, string> = { DRAFT: "ร่าง", ORDERED: "สั่งแล้ว", RECEIVED: "รับแล้ว", CANCELLED: "ยกเลิก" };

export default async function PurchasesPage() {
  const supabase = await createClient();
  const [{ data: suppliersData }, { data: ordersData }] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
  ]);
  const suppliers = (suppliersData || []) as Supplier[];
  const orders = (ordersData || []) as PurchaseOrder[];
  const supplierMap = new Map(suppliers.map((x) => [x.id, x]));

  return (
    <AppShell>
      <div className="page-head"><div><h1>Purchase Order</h1><p className="muted">สร้างใบสั่งซื้อ และเมื่อกดรับสินค้า ระบบจะเพิ่ม Stock + Price History อัตโนมัติ</p></div></div>
      <section className="card">
        <h2>สร้าง PO</h2>
        <form action={createPurchaseOrder} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>เลข PO</label><input name="po_number" placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ" /></div>
          <div className="field" style={{ gridColumn: "span 2" }}><label>Supplier</label><select name="supplier_id"><option value="">ไม่ระบุ</option>{suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field" style={{ gridColumn: "span 2" }}><label>หมายเหตุ</label><input name="notes" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">สร้าง PO</button></div>
        </form>
      </section>
      <section className="section table-wrap">
        {orders.length === 0 ? <div className="empty">ยังไม่มี Purchase Order</div> : <table>
          <thead><tr><th>PO</th><th>Supplier</th><th>สถานะ</th><th>วันที่สร้าง</th></tr></thead>
          <tbody>{orders.map((po) => <tr key={po.id}><td><Link href={`/purchases/${po.id}`}><strong>{po.po_number}</strong></Link></td><td>{po.supplier_id ? supplierMap.get(po.supplier_id)?.name || "-" : "-"}</td><td><span className={`badge ${po.status === "RECEIVED" ? "good" : po.status === "CANCELLED" ? "warn" : ""}`}>{statusText[po.status] || po.status}</span></td><td>{new Date(po.created_at).toLocaleString("th-TH")}</td></tr>)}</tbody>
        </table>}
      </section>
    </AppShell>
  );
}
