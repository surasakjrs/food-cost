-- Run after creating at least one Auth user.
-- Seeds data into the first user in auth.users for local/demo use only.
do $$
declare
  uid uuid;
  pork_id uuid;
  rice_id uuid;
  sauce_id uuid;
  menu_id uuid;
begin
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is null then
    raise notice 'No auth user found. Create a user first.';
    return;
  end if;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'สันคอหมู', 'เนื้อสัตว์', 'g', 1000, 180, 90)
  returning id into pork_id;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'ข้าวหอมมะลิ', 'ข้าว', 'g', 5000, 190, 100)
  returning id into rice_id;

  insert into public.ingredients (user_id, name, category, base_unit, pack_quantity, pack_price, yield_percent)
  values (uid, 'ซอสหมัก', 'เครื่องปรุง', 'ml', 700, 55, 100)
  returning id into sauce_id;

  insert into public.menus (user_id, name, servings, sell_price, packaging_cost, overhead_cost, target_food_cost_percent)
  values (uid, 'ข้าวหมูย่าง', 1, 69, 5, 3, 35)
  returning id into menu_id;

  insert into public.menu_ingredients (menu_id, ingredient_id, quantity) values
  (menu_id, pork_id, 150),
  (menu_id, rice_id, 100),
  (menu_id, sauce_id, 20);
end $$;
