do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'ingredient_adjustment_type'
  ) then
    create type public.ingredient_adjustment_type as enum ('stock_in', 'stock_out', 'manual', 'waste', 'sale');
  end if;
end $$;

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null,
  unit text not null,
  quantity_on_hand numeric(12, 3) not null default 0 check (quantity_on_hand >= 0),
  low_stock_threshold numeric(12, 3) not null default 0 check (low_stock_threshold >= 0),
  cost_per_unit numeric(12, 4) not null default 0 check (cost_per_unit >= 0),
  supplier text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  ingredient_id uuid not null,
  quantity_required numeric(12, 3) not null check (quantity_required > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, ingredient_id)
);

create table if not exists public.ingredient_adjustments (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null,
  user_id uuid not null,
  adjustment_type public.ingredient_adjustment_type not null,
  quantity_delta numeric(12, 3) not null check (quantity_delta <> 0),
  previous_quantity numeric(12, 3) not null check (previous_quantity >= 0),
  new_quantity numeric(12, 3) not null check (new_quantity >= 0),
  reason text,
  reference_order_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique not null,
  description text,
  price_delta numeric(12, 2) not null default 0 check (price_delta >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_addon_ingredients (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null,
  ingredient_id uuid not null,
  quantity_required numeric(12, 3) not null check (quantity_required > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (addon_id, ingredient_id)
);

create table if not exists public.product_addon_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  addon_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, addon_id)
);

create table if not exists public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null,
  addon_id uuid not null,
  addon_name text not null,
  price_delta numeric(12, 2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and confrelid = 'public.products'::regclass
      and contype = 'f'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_product_id_inventory_fk
      foreign key (product_id) references public.products (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_ingredients'::regclass
      and confrelid = 'public.ingredients'::regclass
      and contype = 'f'
  ) then
    alter table public.product_ingredients
      add constraint product_ingredients_ingredient_id_inventory_fk
      foreign key (ingredient_id) references public.ingredients (id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_addon_ingredients'::regclass
      and confrelid = 'public.product_addons'::regclass
      and contype = 'f'
  ) then
    alter table public.product_addon_ingredients
      add constraint product_addon_ingredients_addon_id_inventory_fk
      foreign key (addon_id) references public.product_addons (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_addon_ingredients'::regclass
      and confrelid = 'public.ingredients'::regclass
      and contype = 'f'
  ) then
    alter table public.product_addon_ingredients
      add constraint product_addon_ingredients_ingredient_id_inventory_fk
      foreign key (ingredient_id) references public.ingredients (id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_addon_links'::regclass
      and confrelid = 'public.products'::regclass
      and contype = 'f'
  ) then
    alter table public.product_addon_links
      add constraint product_addon_links_product_id_inventory_fk
      foreign key (product_id) references public.products (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.product_addon_links'::regclass
      and confrelid = 'public.product_addons'::regclass
      and contype = 'f'
  ) then
    alter table public.product_addon_links
      add constraint product_addon_links_addon_id_inventory_fk
      foreign key (addon_id) references public.product_addons (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_item_addons'::regclass
      and confrelid = 'public.order_items'::regclass
      and contype = 'f'
  ) then
    alter table public.order_item_addons
      add constraint order_item_addons_order_item_id_inventory_fk
      foreign key (order_item_id) references public.order_items (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_item_addons'::regclass
      and confrelid = 'public.product_addons'::regclass
      and contype = 'f'
  ) then
    alter table public.order_item_addons
      add constraint order_item_addons_addon_id_inventory_fk
      foreign key (addon_id) references public.product_addons (id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ingredient_adjustments'::regclass
      and confrelid = 'public.ingredients'::regclass
      and contype = 'f'
  ) then
    alter table public.ingredient_adjustments
      add constraint ingredient_adjustments_ingredient_id_inventory_fk
      foreign key (ingredient_id) references public.ingredients (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ingredient_adjustments'::regclass
      and confrelid = 'public.profiles'::regclass
      and contype = 'f'
  ) then
    alter table public.ingredient_adjustments
      add constraint ingredient_adjustments_user_id_inventory_fk
      foreign key (user_id) references public.profiles (id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ingredient_adjustments'::regclass
      and confrelid = 'public.orders'::regclass
      and contype = 'f'
  ) then
    alter table public.ingredient_adjustments
      add constraint ingredient_adjustments_reference_order_id_inventory_fk
      foreign key (reference_order_id) references public.orders (id) on delete set null;
  end if;
end $$;

create index if not exists ingredients_active_category_name_idx on public.ingredients (is_active, category, name);
create index if not exists ingredients_low_stock_idx on public.ingredients (is_active, quantity_on_hand, low_stock_threshold);
create unique index if not exists ingredients_sku_uidx on public.ingredients (sku);
create unique index if not exists product_ingredients_product_ingredient_uidx on public.product_ingredients (product_id, ingredient_id);
create index if not exists product_ingredients_product_idx on public.product_ingredients (product_id);
create index if not exists product_ingredients_ingredient_idx on public.product_ingredients (ingredient_id);
create index if not exists ingredient_adjustments_ingredient_idx on public.ingredient_adjustments (ingredient_id, created_at desc);
create index if not exists ingredient_adjustments_user_idx on public.ingredient_adjustments (user_id, created_at desc);
create index if not exists ingredient_adjustments_order_idx on public.ingredient_adjustments (reference_order_id);
create unique index if not exists product_addons_sku_uidx on public.product_addons (sku);
create unique index if not exists product_addon_ingredients_addon_ingredient_uidx on public.product_addon_ingredients (addon_id, ingredient_id);
create index if not exists product_addon_ingredients_addon_idx on public.product_addon_ingredients (addon_id);
create index if not exists product_addon_ingredients_ingredient_idx on public.product_addon_ingredients (ingredient_id);
create unique index if not exists product_addon_links_product_addon_uidx on public.product_addon_links (product_id, addon_id);
create index if not exists product_addon_links_product_idx on public.product_addon_links (product_id);
create index if not exists product_addon_links_addon_idx on public.product_addon_links (addon_id);
create index if not exists order_item_addons_order_item_idx on public.order_item_addons (order_item_id);
create index if not exists order_item_addons_addon_idx on public.order_item_addons (addon_id);

drop trigger if exists set_ingredients_updated_at on public.ingredients;
create trigger set_ingredients_updated_at
  before update on public.ingredients
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_product_addons_updated_at on public.product_addons;
create trigger set_product_addons_updated_at
  before update on public.product_addons
  for each row execute procedure public.set_updated_at();

alter table public.ingredients enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.ingredient_adjustments enable row level security;
alter table public.product_addons enable row level security;
alter table public.product_addon_ingredients enable row level security;
alter table public.product_addon_links enable row level security;
alter table public.order_item_addons enable row level security;

grant select, insert, update, delete on public.ingredients to authenticated;
grant select, insert, update, delete on public.product_ingredients to authenticated;
grant select on public.ingredient_adjustments to authenticated;
grant select, insert, update, delete on public.product_addons to authenticated;
grant select, insert, update, delete on public.product_addon_ingredients to authenticated;
grant select, insert, update, delete on public.product_addon_links to authenticated;
grant select on public.order_item_addons to authenticated;

drop policy if exists "ingredients_active_read" on public.ingredients;
create policy "ingredients_active_read"
on public.ingredients for select to authenticated
using (is_active = true);

drop policy if exists "ingredients_inactive_management_read" on public.ingredients;
create policy "ingredients_inactive_management_read"
on public.ingredients for select to authenticated
using (public.is_manager_or_admin());

drop policy if exists "ingredients_management_write" on public.ingredients;
create policy "ingredients_management_write"
on public.ingredients for all to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "product_ingredients_authenticated_read" on public.product_ingredients;
create policy "product_ingredients_authenticated_read"
on public.product_ingredients for select to authenticated
using (true);

drop policy if exists "product_ingredients_management_write" on public.product_ingredients;
create policy "product_ingredients_management_write"
on public.product_ingredients for all to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "ingredient_adjustments_management_read" on public.ingredient_adjustments;
create policy "ingredient_adjustments_management_read"
on public.ingredient_adjustments for select to authenticated
using (public.is_manager_or_admin());

drop policy if exists "product_addons_active_read" on public.product_addons;
create policy "product_addons_active_read"
on public.product_addons for select to authenticated
using (is_active = true);

drop policy if exists "product_addons_inactive_management_read" on public.product_addons;
create policy "product_addons_inactive_management_read"
on public.product_addons for select to authenticated
using (public.is_manager_or_admin());

drop policy if exists "product_addons_management_write" on public.product_addons;
create policy "product_addons_management_write"
on public.product_addons for all to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "product_addon_ingredients_authenticated_read" on public.product_addon_ingredients;
create policy "product_addon_ingredients_authenticated_read"
on public.product_addon_ingredients for select to authenticated
using (true);

drop policy if exists "product_addon_ingredients_management_write" on public.product_addon_ingredients;
create policy "product_addon_ingredients_management_write"
on public.product_addon_ingredients for all to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "product_addon_links_authenticated_read" on public.product_addon_links;
create policy "product_addon_links_authenticated_read"
on public.product_addon_links for select to authenticated
using (true);

drop policy if exists "product_addon_links_management_write" on public.product_addon_links;
create policy "product_addon_links_management_write"
on public.product_addon_links for all to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "order_item_addons_view_own_or_management" on public.order_item_addons;
create policy "order_item_addons_view_own_or_management"
on public.order_item_addons for select to authenticated
using (
  exists (
    select 1
    from public.order_items as oi
    join public.orders as o on o.id = oi.order_id
    where oi.id = order_item_addons.order_item_id
      and (o.cashier_id = auth.uid() or public.is_manager_or_admin())
  )
);
