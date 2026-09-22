# FoodCost — Next.js + Supabase

MVP สำหรับคำนวณต้นทุนเมนูอาหารจากราคาวัตถุดิบจริง รองรับ Yield/สูญเสีย, ต้นทุนต่อสูตร, ต้นทุนต่อเสิร์ฟ, Food Cost %, กำไรขั้นต้น และราคาขายแนะนำ

## Stack
- Next.js 16 App Router + TypeScript
- Supabase Auth + Postgres + Row Level Security
- @supabase/ssr สำหรับ cookie-based auth
- CSS แบบ minimal ไม่มี UI framework เพิ่ม

## สูตรคำนวณ
1. ปริมาณใช้ได้จริง = ปริมาณต่อแพ็ก × (Yield / 100)
2. ต้นทุนต่อหน่วย = ราคาแพ็ก / ปริมาณใช้ได้จริง
3. ต้นทุนวัตถุดิบในสูตร = ต้นทุนต่อหน่วย × จำนวนที่ใช้
4. ต้นทุนทั้งสูตร = วัตถุดิบรวม + ค่าแพ็กเกจ + ค่าใช้จ่ายอื่น
5. ต้นทุนต่อเสิร์ฟ = ต้นทุนทั้งสูตร / จำนวนเสิร์ฟ
6. Food Cost % = ต้นทุนต่อเสิร์ฟ / ราคาขาย × 100
7. ราคาขายแนะนำ = ต้นทุนต่อเสิร์ฟ / (Food Cost เป้าหมาย / 100)

## เริ่มใช้งาน
1. สร้าง Supabase project
2. เปิด SQL Editor และรัน `supabase/migrations/001_initial.sql`
3. เปิด Email/Password Auth ใน Supabase
4. Copy `.env.example` เป็น `.env.local` แล้วใส่ Project URL และ Publishable key
5. ติดตั้งและรัน

```bash
npm install
npm run dev
```

6. สมัครผู้ใช้ที่ `/login`
7. ถ้าต้องการข้อมูลตัวอย่าง ให้รัน `supabase/seed.sql` หลังสร้างผู้ใช้แล้ว

## ฟีเจอร์ MVP
- สมัคร/เข้าสู่ระบบ
- RLS แยกข้อมูลแต่ละผู้ใช้
- เพิ่ม/ลบวัตถุดิบ
- หน่วย g / ml / pcs
- รองรับ Yield %
- สร้าง/ลบเมนู
- ใส่วัตถุดิบและปริมาณลงสูตร
- ค่าแพ็กเกจ + ค่าใช้จ่ายอื่น
- Food Cost เป้าหมาย
- ราคาขายแนะนำ
- Dashboard ภาพรวม

## แนะนำ Phase 2
- Supplier และประวัติราคาซื้อ
- Conversion หน่วย (kg→g, L→ml, pack→pcs)
- Sub-recipe เช่น ซอส/น้ำสต๊อกที่ผลิตเอง
- Inventory/stock และ Purchase Order
- Import CSV/Excel
- Dashboard กำไรตามยอดขายจริง
- Multi-store / Team / Roles
