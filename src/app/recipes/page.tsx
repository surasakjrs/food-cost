import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { addSubRecipe, deleteSubRecipe } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import type { SubRecipe } from "@/lib/types";

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("sub_recipes").select("*").order("created_at", { ascending: false });
  const recipes = (data || []) as SubRecipe[];
  return (
    <AppShell>
      <div className="page-head"><div><h1>สูตรย่อย / Sub Recipe</h1><p className="muted">เช่น ซอสหมัก น้ำสต๊อก น้ำจิ้ม หรือแป้งผสม แล้วนำไปใช้ในเมนูหลัก</p></div></div>
      <section className="card">
        <h2>สร้างสูตรย่อย</h2>
        <form action={addSubRecipe} className="form-grid">
          <div className="field" style={{ gridColumn: "span 2" }}><label>ชื่อสูตร</label><input name="name" required placeholder="เช่น ซอสหมักหมู" /></div>
          <div className="field"><label>ผลผลิตที่ได้</label><input name="output_quantity" type="number" step="0.01" min="0.01" defaultValue="1000" /></div>
          <div className="field"><label>หน่วยผลผลิต</label><select name="output_unit"><option value="g">g</option><option value="ml">ml</option><option value="pcs">pcs</option></select></div>
          <div className="field"><label>Yield (%)</label><input name="yield_percent" type="number" min="1" max="100" step="0.1" defaultValue="100" /></div>
          <div className="field"><label>หมายเหตุ</label><input name="notes" /></div>
          <div className="field" style={{ justifyContent: "end" }}><button className="btn">สร้างสูตร</button></div>
        </form>
      </section>
      <section className="section grid grid-2">
        {recipes.map((r) => <div className="card" key={r.id}><div className="row-between"><div><h2><Link href={`/recipes/${r.id}`}>{r.name}</Link></h2><p className="muted">ได้ {Number(r.output_quantity).toLocaleString("th-TH")} {r.output_unit} · Yield {r.yield_percent}%</p></div><form action={deleteSubRecipe}><input type="hidden" name="id" value={r.id} /><button className="btn danger small">ลบ</button></form></div></div>)}
        {recipes.length === 0 && <div className="card empty">ยังไม่มีสูตรย่อย</div>}
      </section>
    </AppShell>
  );
}
