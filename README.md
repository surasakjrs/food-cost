# FoodCost — Next.js + Supabase (Phase 2)

เว็บคำนวณต้นทุนเมนูอาหารจากราคาวัตถุดิบจริง พร้อมระบบจัดซื้อและสต็อกเบื้องต้น

## Stack
- Next.js 16 App Router + TypeScript
- Supabase Auth + Postgres + Row Level Security
- `@supabase/ssr` สำหรับ cookie-based session
- Supabase Admin API เฉพาะฝั่ง server สำหรับ Username/Password registration
- CSS แบบ minimal ไม่มี UI framework เพิ่ม

## ฟีเจอร์

### Food Cost
- วัตถุดิบ + ราคาแพ็ก + Yield
- Unit conversion มาตรฐาน `g/kg/mg`, `ml/l`, `pcs`
- Custom conversion รายวัตถุดิบ เช่น `1 tbsp = 15 ml`
- สูตรย่อย / Sub Recipe เช่น ซอส, น้ำสต๊อก, น้ำจิ้ม
- เมนูหลักใช้ทั้งวัตถุดิบตรงและสูตรย่อย
- Packaging / Overhead
- ต้นทุนต่อสูตร / ต่อเสิร์ฟ
- Food Cost % / กำไรขั้นต้น / ราคาขายแนะนำ

### Purchasing & Inventory
- Supplier
- ประวัติราคาวัตถุดิบ
- Purchase Order: `DRAFT -> ORDERED -> RECEIVED`
- รับ PO แล้วอัปเดต Stock + Price History + ราคาปัจจุบันของวัตถุดิบพร้อมกัน
- Stock Movement
- Reorder level / แจ้งเตือนของใกล้หมด
- Dashboard รวม Food Cost + Stock + PO

### Auth
หน้าเว็บใช้เพียง:
- Username
- Password
- Re-password ตอนสมัคร

ผู้ใช้ไม่ต้องกรอกอีเมล ไม่ต้อง OTP และไม่ต้องยืนยันบัญชี

ภายใน server จะสร้าง Supabase Auth user พร้อม internal auth email และ `email_confirm: true` ผ่าน Admin API จากนั้นสร้าง session ให้ทันที ผู้ใช้จะไม่เห็นหรือใช้งาน internal email นี้

> `SUPABASE_SERVICE_ROLE_KEY` เป็น secret ฝั่ง server เท่านั้น ห้ามใส่ `NEXT_PUBLIC_` และห้ามส่งไป browser

## สูตรคำนวณหลัก

1. ปริมาณใช้ได้จริง = ปริมาณต่อแพ็ก × (Yield / 100)
2. ต้นทุนต่อหน่วยหลัก = ราคาแพ็ก / ปริมาณใช้ได้จริง
3. จำนวนในสูตรจะถูกแปลงเป็น base unit ก่อนคำนวณ
4. ต้นทุน Sub Recipe ต่อหน่วย = ต้นทุนวัตถุดิบรวม / ผลผลิตใช้ได้จริง
5. ต้นทุนเมนู = วัตถุดิบตรง + Sub Recipe + Packaging + Overhead
6. ต้นทุนต่อเสิร์ฟ = ต้นทุนเมนู / จำนวนเสิร์ฟ
7. Food Cost % = ต้นทุนต่อเสิร์ฟ / ราคาขาย × 100
8. ราคาขายแนะนำ = ต้นทุนต่อเสิร์ฟ / (Food Cost เป้าหมาย / 100)

## Setup

### 1. Supabase
สร้าง Supabase project และเปิด Email/Password provider

รัน SQL ตามลำดับ:

```text
supabase/migrations/001_initial.sql
supabase/migrations/002_phase2.sql
```

ถ้าเป็นโปรเจกต์ Phase 1 เดิม ให้รันเฉพาะ `002_phase2.sql` เพิ่ม

### 2. Environment

```bash
cp .env.example .env.local
```

ใส่ค่า:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Service Role Key อยู่ใน Supabase project settings และต้องใช้เฉพาะ server

### 3. Run

```bash
npm install
npm run dev
```

เปิด:

```text
http://localhost:3000/register
```

สมัครด้วย Username / Password / Re-password แล้วระบบจะเข้าสู่ระบบทันที

## Seed Data
หลังมี Auth user อย่างน้อยหนึ่งบัญชี ให้รัน:

```text
supabase/seed.sql
```

Seed จะสร้างตัวอย่าง:
- Supplier
- วัตถุดิบ
- Price History
- Custom unit conversion
- Sub Recipe ซอสหมัก
- เมนูข้าวหมูย่าง
- Stock
- Purchase Order แบบ Draft

## Routes

```text
/                 Dashboard
/login            Login
/register         Register
/ingredients      วัตถุดิบ + Unit Conversion
/prices           Price History
/suppliers        Supplier
/recipes          Sub Recipe
/menus            เมนูอาหาร
/stock            Inventory + Movement
/purchases        Purchase Order
```

## หมายเหตุ Auth
Supabase Password Auth ใช้ email/phone เป็น identifier ภายในระบบ จึงมี internal auth email สำหรับแต่ละ username แต่การสร้าง account ทำผ่าน Admin API และ auto-confirm ฝั่ง server จึงไม่มี confirmation flow สำหรับผู้ใช้

ระบบนี้ยังไม่ได้ทำ Forgot Password เพราะไม่มีอีเมล/เบอร์โทรสำหรับ recovery หากนำขึ้น production ควรเพิ่ม flow สำหรับ admin reset password หรือ recovery method ที่เหมาะสม
