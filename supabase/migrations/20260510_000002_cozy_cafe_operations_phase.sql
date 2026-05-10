create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'seed_account_roles'
  ) then
    alter table public.seed_account_roles set schema private;
  end if;
end $$;

revoke all on all tables in schema private from public;
revoke all on all tables in schema private from anon;
revoke all on all tables in schema private from authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'discount_scope') then
    create type public.discount_scope as enum ('senior', 'pwd', 'promo', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'discount_value_type') then
    create type public.discount_value_type as enum ('fixed', 'percent');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_adjustment_type') then
    create type public.inventory_adjustment_type as enum ('stock_in', 'stock_out', 'manual', 'sale', 'waste');
  end if;
end $$;

alter type public.payment_method add value if not exists 'instapay';
alter type public.payment_method add value if not exists 'other';

alter table public.products
  add column if not exists low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  scope public.discount_scope not null,
  value_type public.discount_value_type not null,
  value_amount numeric(12, 2) not null check (value_amount >= 0),
  description text not null default '',
  allowed_roles public.app_role[] not null default array['admin', 'manager', 'cashier']::public.app_role[],
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders
  add column if not exists discount_id uuid references public.discounts (id) on delete set null,
  add column if not exists discount_label text,
  add column if not exists discount_code text,
  add column if not exists discount_type public.discount_value_type,
  add column if not exists discount_value numeric(12, 2),
  add column if not exists payment_reference text,
  add column if not exists amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  add column if not exists change_due numeric(12, 2) not null default 0 check (change_due >= 0),
  add column if not exists payment_notes text;

alter table public.order_items
  add column if not exists product_name text;

update public.order_items oi
set product_name = p.name
from public.products p
where oi.product_id = p.id
  and (oi.product_name is null or oi.product_name = '');

alter table public.order_items
  alter column product_name set default '',
  alter column product_name set not null;

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  adjustment_type public.inventory_adjustment_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  previous_quantity integer not null check (previous_quantity >= 0),
  new_quantity integer not null check (new_quantity >= 0),
  reason text,
  reference_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists products_low_stock_idx on public.products (is_active, stock_quantity, low_stock_threshold);
create index if not exists discounts_active_idx on public.discounts (is_active, expires_at);
create index if not exists inventory_adjustments_product_idx on public.inventory_adjustments (product_id, created_at desc);
create index if not exists inventory_adjustments_user_idx on public.inventory_adjustments (user_id, created_at desc);
create index if not exists inventory_adjustments_order_idx on public.inventory_adjustments (reference_order_id);

drop trigger if exists set_discounts_updated_at on public.discounts;
create trigger set_discounts_updated_at
  before update on public.discounts
  for each row execute procedure public.set_updated_at();

alter table public.discounts enable row level security;
alter table public.inventory_adjustments enable row level security;

drop policy if exists "discounts_active_read" on public.discounts;
create policy "discounts_active_read"
on public.discounts
for select
to authenticated
using (
  (
    is_active = true
    and (expires_at is null or expires_at >= timezone('utc', now()))
  )
  or public.is_manager_or_admin()
);

drop policy if exists "discounts_manager_write" on public.discounts;
create policy "discounts_manager_write"
on public.discounts
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "inventory_adjustments_management_read" on public.inventory_adjustments;
create policy "inventory_adjustments_management_read"
on public.inventory_adjustments
for select
to authenticated
using (public.is_manager_or_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  seeded_role private.seed_account_roles%rowtype;
begin
  select *
  into seeded_role
  from private.seed_account_roles
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

create or replace function private.create_order_impl(
  p_order_type text,
  p_payment_method text,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb,
  p_discount_id uuid default null,
  p_amount_paid numeric default null,
  p_payment_reference text default null,
  p_payment_notes text default null
)
returns table (
  id uuid,
  order_number text,
  grand_total numeric
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  item jsonb;
  selected_product public.products%rowtype;
  selected_discount public.discounts%rowtype;
  qty integer;
  previous_quantity integer;
  computed_subtotal numeric(12, 2) := 0;
  computed_discount numeric(12, 2) := 0;
  taxable_subtotal numeric(12, 2) := 0;
  computed_tax numeric(12, 2) := 0;
  computed_total numeric(12, 2) := 0;
  computed_amount_paid numeric(12, 2) := 0;
  computed_change numeric(12, 2) := 0;
  active_role public.app_role;
  new_order public.orders%rowtype;
  normalized_reference text := nullif(trim(coalesce(p_payment_reference, '')), '');
  normalized_payment_notes text := nullif(trim(coalesce(p_payment_notes, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required.';
  end if;

  select role
  into active_role
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if active_role is null then
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

  if p_discount_id is not null then
    select *
    into selected_discount
    from public.discounts
    where id = p_discount_id
      and is_active = true
      and (expires_at is null or expires_at >= timezone('utc', now()));

    if selected_discount.id is null then
      raise exception 'Selected discount is unavailable.';
    end if;

    if not (active_role = any(selected_discount.allowed_roles)) then
      raise exception 'Your role is not allowed to apply this discount.';
    end if;

    if selected_discount.scope = 'manual' and active_role not in ('admin', 'manager') then
      raise exception 'Manual discounts require manager approval.';
    end if;

    if selected_discount.value_type = 'percent' then
      computed_discount := round(computed_subtotal * (selected_discount.value_amount / 100), 2);
    else
      computed_discount := least(computed_subtotal, selected_discount.value_amount);
    end if;
  end if;

  taxable_subtotal := greatest(computed_subtotal - computed_discount, 0);
  computed_tax := round(taxable_subtotal * 0.12, 2);
  computed_total := taxable_subtotal + computed_tax;

  if p_payment_method::public.payment_method = 'cash' then
    computed_amount_paid := round(coalesce(p_amount_paid, 0), 2);

    if computed_amount_paid < computed_total then
      raise exception 'Cash tendered must cover the order total.';
    end if;

    computed_change := round(computed_amount_paid - computed_total, 2);
  else
    if p_payment_method::public.payment_method in ('gcash', 'qr', 'instapay') and normalized_reference is null then
      raise exception 'A payment reference is required for the selected payment method.';
    end if;

    computed_amount_paid := computed_total;
    computed_change := 0;
  end if;

  insert into public.orders (
    cashier_id,
    order_type,
    payment_method,
    notes,
    subtotal,
    discount_id,
    discount_label,
    discount_code,
    discount_type,
    discount_value,
    discount_total,
    tax_total,
    grand_total,
    payment_reference,
    amount_paid,
    change_due,
    payment_notes
  )
  values (
    auth.uid(),
    p_order_type::public.order_channel,
    p_payment_method::public.payment_method,
    nullif(trim(coalesce(p_notes, '')), ''),
    computed_subtotal,
    selected_discount.id,
    selected_discount.name,
    selected_discount.code,
    selected_discount.value_type,
    selected_discount.value_amount,
    computed_discount,
    computed_tax,
    computed_total,
    normalized_reference,
    computed_amount_paid,
    computed_change,
    normalized_payment_notes
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

    previous_quantity := selected_product.stock_quantity;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total
    )
    values (
      new_order.id,
      selected_product.id,
      selected_product.name,
      qty,
      selected_product.price_amount,
      selected_product.price_amount * qty
    );

    update public.products
    set stock_quantity = stock_quantity - qty
    where id = selected_product.id
    returning stock_quantity into selected_product.stock_quantity;

    insert into public.inventory_adjustments (
      product_id,
      user_id,
      adjustment_type,
      quantity_delta,
      previous_quantity,
      new_quantity,
      reason,
      reference_order_id
    )
    values (
      selected_product.id,
      auth.uid(),
      'sale',
      qty * -1,
      previous_quantity,
      selected_product.stock_quantity,
      format('Sold via order %s', new_order.order_number),
      new_order.id
    );
  end loop;

  return query
  select new_order.id, new_order.order_number, new_order.grand_total;
end;
$$;

create or replace function public.create_order(
  p_order_type text,
  p_payment_method text,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb,
  p_discount_id uuid default null,
  p_amount_paid numeric default null,
  p_payment_reference text default null,
  p_payment_notes text default null
)
returns table (
  id uuid,
  order_number text,
  grand_total numeric
)
language sql
security invoker
set search_path = public, private
as $$
  select *
  from private.create_order_impl(
    p_order_type,
    p_payment_method,
    p_notes,
    p_items,
    p_discount_id,
    p_amount_paid,
    p_payment_reference,
    p_payment_notes
  );
$$;

create or replace function private.adjust_inventory_impl(
  p_product_id uuid,
  p_quantity_delta integer,
  p_reason text default null,
  p_adjustment_type text default 'manual'
)
returns table (
  product_id uuid,
  stock_quantity integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  selected_product public.products%rowtype;
  active_role public.app_role;
  previous_quantity integer;
  next_quantity integer;
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required.';
  end if;

  select role
  into active_role
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if active_role not in ('admin', 'manager') then
    raise exception 'Only managers and admins can adjust inventory.';
  end if;

  if p_quantity_delta = 0 then
    raise exception 'Adjustment quantity must not be zero.';
  end if;

  select *
  into selected_product
  from public.products
  where id = p_product_id;

  if selected_product.id is null then
    raise exception 'Product not found.';
  end if;

  previous_quantity := selected_product.stock_quantity;
  next_quantity := previous_quantity + p_quantity_delta;

  if next_quantity < 0 then
    raise exception 'Adjustment would make stock negative.';
  end if;

  update public.products
  set stock_quantity = next_quantity
  where id = selected_product.id;

  insert into public.inventory_adjustments (
    product_id,
    user_id,
    adjustment_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    reason
  )
  values (
    selected_product.id,
    auth.uid(),
    p_adjustment_type::public.inventory_adjustment_type,
    p_quantity_delta,
    previous_quantity,
    next_quantity,
    nullif(trim(coalesce(p_reason, '')), '')
  );

  return query
  select selected_product.id, next_quantity;
end;
$$;

create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_quantity_delta integer,
  p_reason text default null,
  p_adjustment_type text default 'manual'
)
returns table (
  product_id uuid,
  stock_quantity integer
)
language sql
security invoker
set search_path = public, private
as $$
  select *
  from private.adjust_inventory_impl(
    p_product_id,
    p_quantity_delta,
    p_reason,
    p_adjustment_type
  );
$$;

revoke all on function private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text) from public;
revoke all on function private.adjust_inventory_impl(uuid, integer, text, text) from public;
grant execute on function private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text) to authenticated;
grant execute on function private.adjust_inventory_impl(uuid, integer, text, text) to authenticated;

revoke all on function public.create_order(text, text, text, jsonb, uuid, numeric, text, text) from public;
revoke all on function public.adjust_inventory(uuid, integer, text, text) from public;
grant execute on function public.create_order(text, text, text, jsonb, uuid, numeric, text, text) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text, text) to authenticated;

insert into public.discounts (code, name, scope, value_type, value_amount, description, allowed_roles, is_active)
values
  ('SENIOR20', 'Senior Citizen', 'senior', 'percent', 20, 'Simplified 20% senior citizen discount.', array['admin', 'manager', 'cashier']::public.app_role[], true),
  ('PWD20', 'PWD', 'pwd', 'percent', 20, 'Simplified 20% PWD discount.', array['admin', 'manager', 'cashier']::public.app_role[], true),
  ('WELCOME10', 'Welcome Promo', 'promo', 'percent', 10, 'Starter promo for returning guests.', array['admin', 'manager', 'cashier']::public.app_role[], true),
  ('COURTESY10', 'Manager Courtesy', 'manual', 'percent', 10, 'Manager-approved courtesy discount.', array['admin', 'manager']::public.app_role[], true)
on conflict (code) do update
set
  name = excluded.name,
  scope = excluded.scope,
  value_type = excluded.value_type,
  value_amount = excluded.value_amount,
  description = excluded.description,
  allowed_roles = excluded.allowed_roles,
  is_active = excluded.is_active;
