import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { addMenu, deleteMenu } from "@/app/actions";
import type { Menu } from "@/lib/types";
import { thb } from "@/lib/cost";

export default async function MenusPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("menus").select("*").order("created_at", { ascending: false });
  const menus = (data || []) as Menu[];

  return (
    <AppShell>
      <div className="page-head"><div><h1>เมนูอาหาร</h1><p className="muted">สร้างสูตรและกำหนดราคาขายเป้าหมาย</p></div></div>
      <section className="card">
        <h2>สร้างเมนูใหม่</h2>
        <form action={addMenu} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อเมนู</label><input name="name" placeholder="เช่น ข้าวหมูย่าง" required /></div>
          <div className="field"><label>จำนวนเสิร์ฟ/สูตร</label><input name="servings" type="number" min="1" defaultValue="1" /></div>
          <div className="field"><label>ราคาขาย/เสิร์ฟ</label><input name="sell_price" type="number" step="0.01" min="0" placeholder="69" /></div>
          <div className="field"><label>ค่าแพ็กเกจ/สูตร</label><input name="packaging_cost" type="number" step="0.01" min="0" defaultValue="0" /></div>
          <div className="field"><label>ค่าใช้จ่ายอื่น/สูตร</label><input name="overhead_cost" type="number" step="0.01" min="0" defaultValue="0" /></div>
          <div className="field"><label>Food Cost เป้าหมาย (%)</label><input name="target_food_cost_percent" type="number" step="0.1" min="1" max="100" defaultValue="30" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">สร้างเมนู</button></div>
        </form>
      </section>

      <section className="section grid grid-2">
        {menus.map((menu) => (
          <div className="card" key={menu.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><h2 style={{ marginBottom: 5 }}><Link href={`/menus/${menu.id}`}>{menu.name}</Link></h2><div className="muted">ขาย {thb(menu.sell_price)} · เป้าหมาย {menu.target_food_cost_percent}%</div></div>
              <form action={deleteMenu}><input type="hidden" name="id" value={menu.id} /><button className="btn danger small">ลบ</button></form>
            </div>
          </div>
        ))}
        {menus.length === 0 && <div className="card empty">ยังไม่มีเมนู</div>}
      </section>
    </AppShell>
  );
}
