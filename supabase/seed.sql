-- FoodCost Phase 2 seed
-- Run after 001_initial.sql + 002_phase2.sql and after at least one Auth user exists.
do $$
declare
  uid uuid;
  supplier_id uuid;
  pork_id uuid;
  rice_id uuid;
  soy_id uuid;
  sugar_id uuid;
  recipe_id uuid;
  menu_id uuid;
  po_id uuid;
begin
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is null then
    raise notice 'No auth user found. Register a user first.';
    return;
  end if;

  if exists (select 1 from public.ingredients where user_id = uid and name = 'สันคอหมู') then
    raise notice 'Demo seed appears to be installed already. Skipping.';
    return;
  end if;

  insert into public.suppliers (user_id, name, contact_name, phone, notes)
  values (uid, 'Fresh Food Supplier', 'ฝ่ายขาย', '02-000-0000', 'ข้อมูลตัวอย่าง')
  returning id into supplier_id;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'สันคอหมู', 'เนื้อสัตว์', 'g', 1000, 180, 90)
  returning id into pork_id;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'ข้าวหอมมะลิ', 'ข้าว', 'g', 5000, 190, 100)
  returning id into rice_id;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'ซีอิ๊วขาว', 'เครื่องปรุง', 'ml', 700, 55, 100)
  returning id into soy_id;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'น้ำตาลทราย', 'เครื่องปรุง', 'g', 1000, 32, 100)
  returning id into sugar_id;

  insert into public.ingredient_prices (user_id, ingredient_id, supplier_id, pack_quantity, pack_price, note) values
    (uid, pork_id, supplier_id, 1000, 180, 'ราคาเริ่มต้น'),
    (uid, rice_id, supplier_id, 5000, 190, 'ราคาเริ่มต้น'),
    (uid, soy_id, supplier_id, 700, 55, 'ราคาเริ่มต้น'),
    (uid, sugar_id, supplier_id, 1000, 32, 'ราคาเริ่มต้น');

  insert into public.ingredient_conversions (user_id, ingredient_id, unit_name, base_quantity)
  values (uid, soy_id, 'tbsp', 15);

  insert into public.sub_recipes (user_id, name, output_quantity, output_unit, yield_percent, notes)
  values (uid, 'ซอสหมักหมู', 145, 'ml', 95, 'ตัวอย่าง Sub Recipe')
  returning id into recipe_id;

  insert into public.sub_recipe_ingredients (sub_recipe_id, ingredient_id, quantity, unit) values
    (recipe_id, soy_id, 6, 'tbsp'),
    (recipe_id, sugar_id, 55, 'g');

  insert into public.menus (user_id, name, servings, sell_price, packaging_cost, overhead_cost, target_food_cost_percent)
  values (uid, 'ข้าวหมูย่าง', 1, 79, 5, 3, 35)
  returning id into menu_id;

  insert into public.menu_ingredients (menu_id, ingredient_id, quantity, unit) values
    (menu_id, pork_id, 150, 'g'),
    (menu_id, rice_id, 100, 'g');

  insert into public.menu_sub_recipes (menu_id, sub_recipe_id, quantity, unit)
  values (menu_id, recipe_id, 25, 'ml');

  insert into public.inventory (user_id, ingredient_id, quantity_on_hand, reorder_level) values
    (uid, pork_id, 5000, 2000),
    (uid, rice_id, 10000, 3000),
    (uid, soy_id, 1400, 500),
    (uid, sugar_id, 3000, 1000);

  insert into public.purchase_orders (user_id, supplier_id, po_number, status, notes)
  values (uid, supplier_id, 'PO-DEMO-001', 'DRAFT', 'ตัวอย่างใบสั่งซื้อ')
  returning id into po_id;

  insert into public.purchase_order_items (purchase_order_id, ingredient_id, quantity_packs, pack_quantity, unit_pack_price) values
    (po_id, pork_id, 5, 1000, 175),
    (po_id, rice_id, 2, 5000, 185);
end $$;
