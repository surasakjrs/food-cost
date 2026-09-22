create extension if not exists pgcrypto;

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  base_unit text not null check (base_unit in ('g', 'ml', 'pcs')),
  pack_quantity numeric(14,4) not null check (pack_quantity > 0),
  pack_price numeric(14,2) not null default 0 check (pack_price >= 0),
  yield_percent numeric(5,2) not null default 100 check (yield_percent > 0 and yield_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings integer not null default 1 check (servings > 0),
  sell_price numeric(14,2) not null default 0 check (sell_price >= 0),
  packaging_cost numeric(14,2) not null default 0 check (packaging_cost >= 0),
  overhead_cost numeric(14,2) not null default 0 check (overhead_cost >= 0),
  target_food_cost_percent numeric(5,2) not null default 30 check (target_food_cost_percent > 0 and target_food_cost_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_ingredients (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (menu_id, ingredient_id)
);

create index if not exists ingredients_user_id_idx on public.ingredients(user_id);
create index if not exists menus_user_id_idx on public.menus(user_id);
create index if not exists menu_ingredients_menu_id_idx on public.menu_ingredients(menu_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at before update on public.ingredients
for each row execute function public.set_updated_at();

drop trigger if exists menus_set_updated_at on public.menus;
create trigger menus_set_updated_at before update on public.menus
for each row execute function public.set_updated_at();

alter table public.ingredients enable row level security;
alter table public.menus enable row level security;
alter table public.menu_ingredients enable row level security;

create policy "ingredients_select_own" on public.ingredients for select to authenticated using (auth.uid() = user_id);
create policy "ingredients_insert_own" on public.ingredients for insert to authenticated with check (auth.uid() = user_id);
create policy "ingredients_update_own" on public.ingredients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ingredients_delete_own" on public.ingredients for delete to authenticated using (auth.uid() = user_id);

create policy "menus_select_own" on public.menus for select to authenticated using (auth.uid() = user_id);
create policy "menus_insert_own" on public.menus for insert to authenticated with check (auth.uid() = user_id);
create policy "menus_update_own" on public.menus for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "menus_delete_own" on public.menus for delete to authenticated using (auth.uid() = user_id);

create policy "menu_ingredients_select_own" on public.menu_ingredients
for select to authenticated using (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
);
create policy "menu_ingredients_insert_own" on public.menu_ingredients
for insert to authenticated with check (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "menu_ingredients_update_own" on public.menu_ingredients
for update to authenticated using (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.user_id = auth.uid())
);
create policy "menu_ingredients_delete_own" on public.menu_ingredients
for delete to authenticated using (
  exists (select 1 from public.menus m where m.id = menu_id and m.user_id = auth.uid())
);
