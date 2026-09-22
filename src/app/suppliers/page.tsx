import { AppShell } from "@/components/app-shell";
import { addSupplier, deleteSupplier } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/types";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*").order("name");
  const suppliers = (data || []) as Supplier[];

  return (
    <AppShell>
      <div className="page-head"><div><h1>Supplier</h1><p className="muted">เก็บข้อมูลผู้ขายเพื่อผูกกับประวัติราคาและ Purchase Order</p></div></div>
      <section className="card">
        <h2>เพิ่ม Supplier</h2>
        <form action={addSupplier} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อ Supplier</label><input name="name" required /></div>
          <div className="field"><label>ผู้ติดต่อ</label><input name="contact_name" /></div>
          <div className="field"><label>โทรศัพท์</label><input name="phone" /></div>
          <div className="field"><label>อีเมล</label><input name="email" type="email" /></div>
          <div className="field"><label>หมายเหตุ</label><input name="notes" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">เพิ่ม Supplier</button></div>
        </form>
      </section>
      <section className="section table-wrap">
        {suppliers.length === 0 ? <div className="empty">ยังไม่มี Supplier</div> : (
          <table><thead><tr><th>Supplier</th><th>ผู้ติดต่อ</th><th>โทรศัพท์</th><th>อีเมล</th><th></th></tr></thead>
          <tbody>{suppliers.map((s) => <tr key={s.id}><td><strong>{s.name}</strong></td><td>{s.contact_name || "-"}</td><td>{s.phone || "-"}</td><td>{s.email || "-"}</td><td className="number"><form action={deleteSupplier}><input type="hidden" name="id" value={s.id} /><button className="btn danger small">ลบ</button></form></td></tr>)}</tbody></table>
        )}
      </section>
    </AppShell>
  );
}
