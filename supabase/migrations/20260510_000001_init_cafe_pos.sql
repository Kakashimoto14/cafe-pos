create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'manager', 'cashier');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_channel') then
    create type public.order_channel as enum ('dine_in', 'takeout', 'delivery');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash', 'card', 'gcash', 'maya', 'qr');
  end if;
end $$;

create table if not exists public.seed_account_roles (
  email text primary key,
  full_name text not null,
  role public.app_role not null
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'cashier',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  sku text not null unique,
  name text not null,
  description text not null default '',
  image_url text,
  price_amount numeric(12, 2) not null check (price_amount >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.generate_order_number()
returns text
language sql
stable
as $$
  select
    'ORD-'
    || to_char(timezone('Asia/Manila', now()), 'YYYYMMDD-HH24MISS')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  cashier_id uuid not null references public.profiles (id) on delete restrict,
  order_type public.order_channel not null,
  payment_method public.payment_method not null,
  notes text,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  tax_total numeric(12, 2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12, 2) not null check (grand_total >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_active_idx on public.profiles (is_active);
create index if not exists categories_active_idx on public.categories (is_active, sort_order);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active, name);
create index if not exists orders_cashier_idx on public.orders (cashier_id);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin', 'manager'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seeded_role public.seed_account_roles%rowtype;
begin
  select *
  into seeded_role
  from public.seed_account_roles
  where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    lower(new.email),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      seeded_role.full_name,
      initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    ),
    coalesce(seeded_role.role, 'cashier'),
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "profiles_self_or_management_read" on public.profiles;
create policy "profiles_self_or_management_read"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_manager_or_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categories_active_read" on public.categories;
create policy "categories_active_read"
on public.categories
for select
to authenticated
using (is_active or public.is_manager_or_admin());

drop policy if exists "categories_manager_write" on public.categories;
create policy "categories_manager_write"
on public.categories
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "products_active_read" on public.products;
create policy "products_active_read"
on public.products
for select
to authenticated
using (is_active or public.is_manager_or_admin());

drop policy if exists "products_manager_write" on public.products;
create policy "products_manager_write"
on public.products
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check (cashier_id = auth.uid());

drop policy if exists "orders_view_own_or_management" on public.orders;
create policy "orders_view_own_or_management"
on public.orders
for select
to authenticated
using (cashier_id = auth.uid() or public.is_manager_or_admin());

drop policy if exists "order_items_view_own_or_management" on public.order_items;
create policy "order_items_view_own_or_management"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and (orders.cashier_id = auth.uid() or public.is_manager_or_admin())
  )
);

create or replace function public.create_order(
  p_order_type text,
  p_payment_method text,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns table (
  id uuid,
  order_number text,
  grand_total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  selected_product public.products%rowtype;
  qty integer;
  computed_subtotal numeric(12, 2) := 0;
  computed_tax numeric(12, 2) := 0;
  new_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  ) then
    raise exception 'Active operator profile required.';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := greatest(coalesce((item ->> 'quantity')::integer, 0), 0);

    if qty <= 0 then
      raise exception 'Each line item quantity must be greater than zero.';
    end if;

    select *
    into selected_product
    from public.products
    where id = (item ->> 'product_id')::uuid
      and is_active = true;

    if selected_product.id is null then
      raise exception 'One or more products are unavailable.';
    end if;

    if selected_product.stock_quantity < qty then
      raise exception 'Insufficient stock for %.', selected_product.name;
    end if;

    computed_subtotal := computed_subtotal + (selected_product.price_amount * qty);
  end loop;

  computed_tax := round(computed_subtotal * 0.12, 2);

  insert into public.orders (
    cashier_id,
    order_type,
    payment_method,
    notes,
    subtotal,
    discount_total,
    tax_total,
    grand_total
  )
  values (
    auth.uid(),
    p_order_type::public.order_channel,
    p_payment_method::public.payment_method,
    nullif(trim(coalesce(p_notes, '')), ''),
    computed_subtotal,
    0,
    computed_tax,
    computed_subtotal + computed_tax
  )
  returning *
  into new_order;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := (item ->> 'quantity')::integer;

    select *
    into selected_product
    from public.products
    where id = (item ->> 'product_id')::uuid;

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      line_total
    )
    values (
      new_order.id,
      selected_product.id,
      qty,
      selected_product.price_amount,
      selected_product.price_amount * qty
    );

    update public.products
    set stock_quantity = stock_quantity - qty
    where id = selected_product.id;
  end loop;

  return query
  select new_order.id, new_order.order_number, new_order.grand_total;
end;
$$;

revoke all on function public.create_order(text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, jsonb) to authenticated;

insert into public.seed_account_roles (email, full_name, role)
values
  ('admin@cafeposdemo.com', 'Cafe Admin', 'admin'),
  ('manager@cafeposdemo.com', 'Cafe Manager', 'manager'),
  ('cashier@cafeposdemo.com', 'Cafe Cashier', 'cashier')
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role;

insert into public.categories (name, slug, sort_order, is_active)
values
  ('Espresso Bar', 'espresso-bar', 1, true),
  ('Signature Cold', 'signature-cold', 2, true),
  ('Pastries', 'pastries', 3, true),
  ('Kitchen', 'kitchen', 4, true)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

insert into public.products (category_id, sku, name, description, image_url, price_amount, stock_quantity, is_active)
select c.id, p.sku, p.name, p.description, p.image_url, p.price_amount, p.stock_quantity, true
from (
  values
    ('espresso-bar', 'COF-ESP-001', 'Espresso', 'Double-shot espresso with a dense crema and dark cocoa finish.', 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80', 120.00, 60),
    ('espresso-bar', 'COF-AMR-002', 'Americano', 'Espresso stretched with hot water for a clean, bold cup.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', 135.00, 50),
    ('espresso-bar', 'COF-LAT-003', 'Latte', 'Silky milk and espresso balanced for all-day cafe service.', 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80', 165.00, 48),
    ('espresso-bar', 'COF-CAP-004', 'Cappuccino', 'Rich espresso with foamed milk and a cloud-soft finish.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=1200&q=80', 170.00, 42),
    ('espresso-bar', 'COF-MOC-005', 'Mocha', 'Espresso layered with dark chocolate and steamed milk.', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=1200&q=80', 185.00, 40),
    ('signature-cold', 'COF-MAT-006', 'Matcha Latte', 'Ceremonial matcha whisked smooth with lightly sweet milk.', 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=1200&q=80', 195.00, 35),
    ('signature-cold', 'COF-ICE-007', 'Iced Coffee', 'Flash-chilled house coffee with bright caramel notes.', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1f9b8?auto=format&fit=crop&w=1200&q=80', 150.00, 52),
    ('signature-cold', 'COF-FRP-008', 'Chocolate Frappe', 'Blended chocolate frappe finished with whipped cream.', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=1200&q=80', 210.00, 28),
    ('pastries', 'PAS-CRO-009', 'Croissant', 'Butter-laminated croissant baked crisp for the morning rush.', 'https://images.unsplash.com/photo-1555507036-ab794f4afe5c?auto=format&fit=crop&w=1200&q=80', 110.00, 24),
    ('pastries', 'PAS-MUF-010', 'Blueberry Muffin', 'Soft vanilla muffin packed with blueberry compote.', 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=1200&q=80', 125.00, 20),
    ('pastries', 'PAS-CAK-011', 'Chocolate Cake', 'Dense chocolate slice with ganache glaze for dessert service.', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80', 175.00, 18),
    ('kitchen', 'KIT-SAN-012', 'Club Sandwich', 'Triple-layer toasted sandwich with chicken, bacon, and greens.', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80', 245.00, 16)
) as p(category_slug, sku, name, description, image_url, price_amount, stock_quantity)
join public.categories c on c.slug = p.category_slug
on conflict (sku) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  price_amount = excluded.price_amount,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active;
