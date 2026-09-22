-- FoodCost Phase 2
-- Run after 001_initial.sql.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text not null unique,
  auth_email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  pack_quantity numeric(14,4) not null check (pack_quantity > 0),
  pack_price numeric(14,2) not null check (pack_price >= 0),
  recorded_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.ingredient_conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  unit_name text not null,
  base_quantity numeric(14,6) not null check (base_quantity > 0),
  created_at timestamptz not null default now(),
  unique (ingredient_id, unit_name)
);

create table if not exists public.sub_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  output_quantity numeric(14,4) not null default 1 check (output_quantity > 0),
  output_unit text not null default 'g' check (output_unit in ('g', 'ml', 'pcs')),
  yield_percent numeric(5,2) not null default 100 check (yield_percent > 0 and yield_percent <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sub_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  sub_recipe_id uuid not null references public.sub_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit text not null,
  created_at timestamptz not null default now(),
  unique (sub_recipe_id, ingredient_id)
);

alter table public.menu_ingredients add column if not exists unit text;
update public.menu_ingredients mi
set unit = i.base_unit
from public.ingredients i
where mi.ingredient_id = i.id and mi.unit is null;
alter table public.menu_ingredients alter column unit set not null;

create table if not exists public.menu_sub_recipes (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  sub_recipe_id uuid not null references public.sub_recipes(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit text not null,
  created_at timestamptz not null default now(),
  unique (menu_id, sub_recipe_id)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity_on_hand numeric(16,4) not null default 0,
  reorder_level numeric(16,4) not null default 0 check (reorder_level >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, ingredient_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  kind text not null check (kind in ('PURCHASE', 'ADJUSTMENT', 'USAGE', 'WASTE', 'RETURN')),
  quantity_delta numeric(16,4) not null check (quantity_delta <> 0),
  unit_cost numeric(14,6),
  ref_type text,
  ref_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  po_number text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED')),
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, po_number)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_packs numeric(14,4) not null check (quantity_packs > 0),
  pack_quantity numeric(14,4) not null check (pack_quantity > 0),
  unit_pack_price numeric(14,2) not null check (unit_pack_price >= 0),
  created_at timestamptz not null default now(),
  unique (purchase_order_id, ingredient_id)
);

create index if not exists suppliers_user_id_idx on public.suppliers(user_id);
create index if not exists ingredient_prices_user_id_idx on public.ingredient_prices(user_id);
create index if not exists ingredient_prices_ingredient_idx on public.ingredient_prices(ingredient_id, recorded_at desc);
create index if not exists ingredient_conversions_ingredient_idx on public.ingredient_conversions(ingredient_id);
create index if not exists sub_recipes_user_id_idx on public.sub_recipes(user_id);
create index if not exists sub_recipe_ingredients_recipe_idx on public.sub_recipe_ingredients(sub_recipe_id);
create index if not exists menu_sub_recipes_menu_idx on public.menu_sub_recipes(menu_id);
create index if not exists inventory_user_id_idx on public.inventory(user_id);
create index if not exists stock_movements_user_id_idx on public.stock_movements(user_id, created_at desc);
create index if not exists purchase_orders_user_id_idx on public.purchase_orders(user_id, created_at desc);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items(purchase_order_id);

-- updated_at triggers

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists sub_recipes_set_updated_at on public.sub_recipes;
create trigger sub_recipes_set_updated_at before update on public.sub_recipes
for each row execute function public.set_updated_at();

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at before update on public.inventory
for each row execute function public.set_updated_at();

drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at before update on public.purchase_orders
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.ingredient_prices enable row level security;
alter table public.ingredient_conversions enable row level security;
alter table public.sub_recipes enable row level security;
alter table public.sub_recipe_ingredients enable row level security;
alter table public.menu_sub_recipes enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

-- Recreate policies so this migration is rerunnable.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Direct-owner tables.
drop policy if exists "suppliers_select_own" on public.suppliers;
drop policy if exists "suppliers_insert_own" on public.suppliers;
drop policy if exists "suppliers_update_own" on public.suppliers;
drop policy if exists "suppliers_delete_own" on public.suppliers;
create policy "suppliers_select_own" on public.suppliers for select to authenticated using (auth.uid() = user_id);
create policy "suppliers_insert_own" on public.suppliers for insert to authenticated with check (auth.uid() = user_id);
create policy "suppliers_update_own" on public.suppliers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suppliers_delete_own" on public.suppliers for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "ingredient_prices_select_own" on public.ingredient_prices;
drop policy if exists "ingredient_prices_insert_own" on public.ingredient_prices;
drop policy if exists "ingredient_prices_delete_own" on public.ingredient_prices;
create policy "ingredient_prices_select_own" on public.ingredient_prices for select to authenticated using (auth.uid() = user_id);
create policy "ingredient_prices_insert_own" on public.ingredient_prices for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
  and (supplier_id is null or exists (select 1 from public.suppliers s where s.id = supplier_id and s.user_id = auth.uid()))
);
create policy "ingredient_prices_delete_own" on public.ingredient_prices for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "ingredient_conversions_select_own" on public.ingredient_conversions;
drop policy if exists "ingredient_conversions_insert_own" on public.ingredient_conversions;
drop policy if exists "ingredient_conversions_update_own" on public.ingredient_conversions;
drop policy if exists "ingredient_conversions_delete_own" on public.ingredient_conversions;
create policy "ingredient_conversions_select_own" on public.ingredient_conversions for select to authenticated using (auth.uid() = user_id);
create policy "ingredient_conversions_insert_own" on public.ingredient_conversions for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "ingredient_conversions_update_own" on public.ingredient_conversions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingredient_conversions_delete_own" on public.ingredient_conversions for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "sub_recipes_select_own" on public.sub_recipes;
drop policy if exists "sub_recipes_insert_own" on public.sub_recipes;
drop policy if exists "sub_recipes_update_own" on public.sub_recipes;
drop policy if exists "sub_recipes_delete_own" on public.sub_recipes;
create policy "sub_recipes_select_own" on public.sub_recipes for select to authenticated using (auth.uid() = user_id);
create policy "sub_recipes_insert_own" on public.sub_recipes for insert to authenticated with check (auth.uid() = user_id);
create policy "sub_recipes_update_own" on public.sub_recipes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sub_recipes_delete_own" on public.sub_recipes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "inventory_select_own" on public.inventory;
drop policy if exists "inventory_insert_own" on public.inventory;
drop policy if exists "inventory_update_own" on public.inventory;
create policy "inventory_select_own" on public.inventory for select to authenticated using (auth.uid() = user_id);
create policy "inventory_insert_own" on public.inventory for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "inventory_update_own" on public.inventory for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "stock_movements_select_own" on public.stock_movements;
drop policy if exists "stock_movements_insert_own" on public.stock_movements;
create policy "stock_movements_select_own" on public.stock_movements for select to authenticated using (auth.uid() = user_id);
create policy "stock_movements_insert_own" on public.stock_movements for insert to authenticated with check (
  auth.uid() = user_id and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);

drop policy if exists "purchase_orders_select_own" on public.purchase_orders;
drop policy if exists "purchase_orders_insert_own" on public.purchase_orders;
drop policy if exists "purchase_orders_update_own" on public.purchase_orders;
drop policy if exists "purchase_orders_delete_own" on public.purchase_orders;
create policy "purchase_orders_select_own" on public.purchase_orders for select to authenticated using (auth.uid() = user_id);
create policy "purchase_orders_insert_own" on public.purchase_orders for insert to authenticated with check (auth.uid() = user_id);
create policy "purchase_orders_update_own" on public.purchase_orders for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "purchase_orders_delete_own" on public.purchase_orders for delete to authenticated using (auth.uid() = user_id);

-- Child tables controlled through their owner parent.
drop policy if exists "sub_recipe_ingredients_select_own" on public.sub_recipe_ingredients;
drop policy if exists "sub_recipe_ingredients_insert_own" on public.sub_recipe_ingredients;
drop policy if exists "sub_recipe_ingredients_update_own" on public.sub_recipe_ingredients;
drop policy if exists "sub_recipe_ingredients_delete_own" on public.sub_recipe_ingredients;
create policy "sub_recipe_ingredients_select_own" on public.sub_recipe_ingredients for select to authenticated using (
  exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
);
create policy "sub_recipe_ingredients_insert_own" on public.sub_recipe_ingredients for insert to authenticated with check (
  exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "sub_recipe_ingredients_update_own" on public.sub_recipe_ingredients for update to authenticated using (
  exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
) with check (
  exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "sub_recipe_ingredients_delete_own" on public.sub_recipe_ingredients for delete to authenticated using (
  exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
);

drop policy if exists "menu_sub_recipes_select_own" on public.menu_sub_recipes;
drop policy if exists "menu_sub_recipes_insert_own" on public.menu_sub_recipes;
drop policy if exists "menu_sub_recipes_update_own" on public.menu_sub_recipes;
drop policy if exists "menu_sub_recipes_delete_own" on public.menu_sub_recipes;
create policy "menu_sub_recipes_select_own" on public.menu_sub_recipes for select to authenticated using (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
);
create policy "menu_sub_recipes_insert_own" on public.menu_sub_recipes for insert to authenticated with check (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
  and exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
);
create policy "menu_sub_recipes_update_own" on public.menu_sub_recipes for update to authenticated using (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
  and exists (select 1 from public.sub_recipes r where r.id = sub_recipe_id and r.user_id = auth.uid())
);
create policy "menu_sub_recipes_delete_own" on public.menu_sub_recipes for delete to authenticated using (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
);

drop policy if exists "purchase_order_items_select_own" on public.purchase_order_items;
drop policy if exists "purchase_order_items_insert_own" on public.purchase_order_items;
drop policy if exists "purchase_order_items_update_own" on public.purchase_order_items;
drop policy if exists "purchase_order_items_delete_own" on public.purchase_order_items;
create policy "purchase_order_items_select_own" on public.purchase_order_items for select to authenticated using (
  exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and p.user_id = auth.uid())
);
create policy "purchase_order_items_insert_own" on public.purchase_order_items for insert to authenticated with check (
  exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and p.user_id = auth.uid() and p.status = 'DRAFT')
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "purchase_order_items_update_own" on public.purchase_order_items for update to authenticated using (
  exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and p.user_id = auth.uid() and p.status = 'DRAFT')
) with check (
  exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and p.user_id = auth.uid() and p.status = 'DRAFT')
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "purchase_order_items_delete_own" on public.purchase_order_items for delete to authenticated using (
  exists (select 1 from public.purchase_orders p where p.id = purchase_order_id and p.user_id = auth.uid() and p.status = 'DRAFT')
);

-- Atomic stock adjustment. Quantity is always stored in the ingredient base unit.
create or replace function public.apply_stock_movement(
  p_ingredient_id uuid,
  p_quantity_delta numeric,
  p_kind text default 'ADJUSTMENT',
  p_unit_cost numeric default null,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_quantity_delta = 0 then raise exception 'Quantity cannot be zero'; end if;
  if p_kind not in ('PURCHASE', 'ADJUSTMENT', 'USAGE', 'WASTE', 'RETURN') then raise exception 'Invalid movement kind'; end if;
  if not exists (select 1 from public.ingredients where id = p_ingredient_id and user_id = uid) then
    raise exception 'Ingredient not found';
  end if;

  insert into public.inventory (user_id, ingredient_id, quantity_on_hand)
  values (uid, p_ingredient_id, p_quantity_delta)
  on conflict (user_id, ingredient_id)
  do update set quantity_on_hand = public.inventory.quantity_on_hand + excluded.quantity_on_hand;

  insert into public.stock_movements (user_id, ingredient_id, kind, quantity_delta, unit_cost, note)
  values (uid, p_ingredient_id, p_kind, p_quantity_delta, p_unit_cost, p_note);
end;
$$;

-- Receiving a PO updates inventory, price history and the current ingredient purchase price atomically.
create or replace function public.receive_purchase_order(p_purchase_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  po public.purchase_orders%rowtype;
  line public.purchase_order_items%rowtype;
  base_qty numeric;
  raw_unit_cost numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into po
  from public.purchase_orders
  where id = p_purchase_order_id and user_id = uid
  for update;

  if not found then raise exception 'Purchase order not found'; end if;
  if po.status = 'RECEIVED' then raise exception 'Purchase order already received'; end if;
  if po.status = 'CANCELLED' then raise exception 'Cancelled purchase order cannot be received'; end if;
  if not exists (select 1 from public.purchase_order_items where purchase_order_id = po.id) then
    raise exception 'Purchase order has no items';
  end if;

  for line in select * from public.purchase_order_items where purchase_order_id = po.id loop
    if not exists (select 1 from public.ingredients i where i.id = line.ingredient_id and i.user_id = uid) then
      raise exception 'Ingredient ownership mismatch';
    end if;

    base_qty := line.quantity_packs * line.pack_quantity;
    raw_unit_cost := case when line.pack_quantity > 0 then line.unit_pack_price / line.pack_quantity else 0 end;

    insert into public.inventory (user_id, ingredient_id, quantity_on_hand)
    values (uid, line.ingredient_id, base_qty)
    on conflict (user_id, ingredient_id)
    do update set quantity_on_hand = public.inventory.quantity_on_hand + excluded.quantity_on_hand;

    insert into public.stock_movements (user_id, ingredient_id, kind, quantity_delta, unit_cost, ref_type, ref_id, note)
    values (uid, line.ingredient_id, 'PURCHASE', base_qty, raw_unit_cost, 'PURCHASE_ORDER', po.id, 'รับสินค้า ' || po.po_number);

    insert into public.ingredient_prices (user_id, ingredient_id, supplier_id, pack_quantity, pack_price, recorded_at, note)
    values (uid, line.ingredient_id, po.supplier_id, line.pack_quantity, line.unit_pack_price, now(), 'รับสินค้าจาก ' || po.po_number);

    update public.ingredients
    set pack_quantity = line.pack_quantity,
        pack_price = line.unit_pack_price
    where id = line.ingredient_id and user_id = uid;
  end loop;

  update public.purchase_orders
  set status = 'RECEIVED',
      ordered_at = coalesce(ordered_at, now()),
      received_at = now()
  where id = po.id;
end;
$$;

grant execute on function public.apply_stock_movement(uuid, numeric, text, numeric, text) to authenticated;
grant execute on function public.receive_purchase_order(uuid) to authenticated;

