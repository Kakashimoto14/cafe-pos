do $$
begin
  if not exists (select 1 from pg_type where typname = 'ingredient_adjustment_type') then
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
  product_id uuid not null references public.products (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity_required numeric(12, 3) not null check (quantity_required > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, ingredient_id)
);

create table if not exists public.ingredient_adjustments (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  adjustment_type public.ingredient_adjustment_type not null,
  quantity_delta numeric(12, 3) not null check (quantity_delta <> 0),
  previous_quantity numeric(12, 3) not null check (previous_quantity >= 0),
  new_quantity numeric(12, 3) not null check (new_quantity >= 0),
  reason text,
  reference_order_id uuid references public.orders (id) on delete set null,
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
  addon_id uuid not null references public.product_addons (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity_required numeric(12, 3) not null check (quantity_required > 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (addon_id, ingredient_id)
);

create table if not exists public.product_addon_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  addon_id uuid not null references public.product_addons (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (product_id, addon_id)
);

create table if not exists public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  addon_id uuid not null references public.product_addons (id) on delete restrict,
  addon_name text not null,
  price_delta numeric(12, 2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ingredients_active_category_name_idx on public.ingredients (is_active, category, name);
create index if not exists ingredients_low_stock_idx on public.ingredients (is_active, quantity_on_hand, low_stock_threshold);
create index if not exists product_ingredients_product_idx on public.product_ingredients (product_id);
create index if not exists product_ingredients_ingredient_idx on public.product_ingredients (ingredient_id);
create index if not exists ingredient_adjustments_ingredient_idx on public.ingredient_adjustments (ingredient_id, created_at desc);
create index if not exists ingredient_adjustments_user_idx on public.ingredient_adjustments (user_id, created_at desc);
create index if not exists ingredient_adjustments_order_idx on public.ingredient_adjustments (reference_order_id);
create index if not exists product_addon_ingredients_addon_idx on public.product_addon_ingredients (addon_id);
create index if not exists product_addon_ingredients_ingredient_idx on public.product_addon_ingredients (ingredient_id);
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
on public.ingredients
for select
to authenticated
using (is_active = true);

drop policy if exists "ingredients_inactive_management_read" on public.ingredients;
create policy "ingredients_inactive_management_read"
on public.ingredients
for select
to authenticated
using (public.is_manager_or_admin());

drop policy if exists "ingredients_management_write" on public.ingredients;
create policy "ingredients_management_write"
on public.ingredients
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "product_ingredients_authenticated_read" on public.product_ingredients;
create policy "product_ingredients_authenticated_read"
on public.product_ingredients
for select
to authenticated
using (true);

drop policy if exists "product_ingredients_management_write" on public.product_ingredients;
create policy "product_ingredients_management_write"
on public.product_ingredients
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "ingredient_adjustments_management_read" on public.ingredient_adjustments;
create policy "ingredient_adjustments_management_read"
on public.ingredient_adjustments
for select
to authenticated
using (public.is_manager_or_admin());

drop policy if exists "product_addons_active_read" on public.product_addons;
create policy "product_addons_active_read"
on public.product_addons
for select
to authenticated
using (is_active = true);

drop policy if exists "product_addons_inactive_management_read" on public.product_addons;
create policy "product_addons_inactive_management_read"
on public.product_addons
for select
to authenticated
using (public.is_manager_or_admin());

drop policy if exists "product_addons_management_write" on public.product_addons;
create policy "product_addons_management_write"
on public.product_addons
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "product_addon_ingredients_authenticated_read" on public.product_addon_ingredients;
create policy "product_addon_ingredients_authenticated_read"
on public.product_addon_ingredients
for select
to authenticated
using (true);

drop policy if exists "product_addon_ingredients_management_write" on public.product_addon_ingredients;
create policy "product_addon_ingredients_management_write"
on public.product_addon_ingredients
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "product_addon_links_authenticated_read" on public.product_addon_links;
create policy "product_addon_links_authenticated_read"
on public.product_addon_links
for select
to authenticated
using (true);

drop policy if exists "product_addon_links_management_write" on public.product_addon_links;
create policy "product_addon_links_management_write"
on public.product_addon_links
for all
to authenticated
using (public.is_manager_or_admin())
with check (public.is_manager_or_admin());

drop policy if exists "order_item_addons_view_own_or_management" on public.order_item_addons;
create policy "order_item_addons_view_own_or_management"
on public.order_item_addons
for select
to authenticated
using (
  exists (
    select 1
    from public.order_items as oi
    join public.orders as o on o.id = oi.order_id
    where oi.id = order_item_addons.order_item_id
      and (o.cashier_id = auth.uid() or public.is_manager_or_admin())
  )
);

create or replace function private.adjust_ingredient_impl(
  p_ingredient_id uuid,
  p_quantity_delta numeric,
  p_reason text default null,
  p_adjustment_type text default 'manual'
)
returns table (
  ingredient_id uuid,
  quantity_on_hand numeric
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  selected_ingredient public.ingredients%rowtype;
  active_role public.app_role;
  previous_quantity numeric(12, 3);
  next_quantity numeric(12, 3);
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required.';
  end if;

  select profile.role
  into active_role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true;

  if active_role not in ('admin', 'manager') then
    raise exception 'Only managers and admins can adjust ingredients.';
  end if;

  if coalesce(p_quantity_delta, 0) = 0 then
    raise exception 'Adjustment quantity must not be zero.';
  end if;

  select ingredient_row.*
  into selected_ingredient
  from public.ingredients as ingredient_row
  where ingredient_row.id = p_ingredient_id
  for update;

  if selected_ingredient.id is null then
    raise exception 'Ingredient not found.';
  end if;

  previous_quantity := selected_ingredient.quantity_on_hand;
  next_quantity := previous_quantity + round(p_quantity_delta, 3);

  if next_quantity < 0 then
    raise exception 'Adjustment would make ingredient stock negative.';
  end if;

  update public.ingredients as ingredient_row
  set quantity_on_hand = next_quantity
  where ingredient_row.id = selected_ingredient.id;

  insert into public.ingredient_adjustments (
    ingredient_id,
    user_id,
    adjustment_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    reason
  )
  values (
    selected_ingredient.id,
    auth.uid(),
    p_adjustment_type::public.ingredient_adjustment_type,
    round(p_quantity_delta, 3),
    previous_quantity,
    next_quantity,
    nullif(trim(coalesce(p_reason, '')), '')
  );

  return query
  select selected_ingredient.id, next_quantity;
end;
$$;

create or replace function public.adjust_ingredient(
  p_ingredient_id uuid,
  p_quantity_delta numeric,
  p_reason text default null,
  p_adjustment_type text default 'manual'
)
returns table (
  ingredient_id uuid,
  quantity_on_hand numeric
)
language sql
security invoker
set search_path = public, private
as $$
  select *
  from private.adjust_ingredient_impl(
    p_ingredient_id,
    p_quantity_delta,
    p_reason,
    p_adjustment_type
  );
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
  addon_item jsonb;
  selected_product public.products%rowtype;
  selected_addon public.product_addons%rowtype;
  selected_discount public.discounts%rowtype;
  selected_ingredient public.ingredients%rowtype;
  demand_row record;
  qty integer;
  addon_qty integer;
  recipe_count integer;
  addon_total_per_unit numeric(12, 2);
  previous_quantity integer;
  previous_ingredient_quantity numeric(12, 3);
  next_ingredient_quantity numeric(12, 3);
  computed_subtotal numeric(12, 2) := 0;
  computed_discount numeric(12, 2) := 0;
  taxable_subtotal numeric(12, 2) := 0;
  computed_tax numeric(12, 2) := 0;
  computed_total numeric(12, 2) := 0;
  computed_amount_paid numeric(12, 2) := 0;
  computed_change numeric(12, 2) := 0;
  active_role public.app_role;
  new_order public.orders%rowtype;
  new_order_item_id uuid;
  normalized_reference text := nullif(trim(coalesce(p_payment_reference, '')), '');
  normalized_payment_notes text := nullif(trim(coalesce(p_payment_notes, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required.';
  end if;

  select profile.role
  into active_role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true;

  if active_role is null then
    raise exception 'Active operator profile required.';
  end if;

  drop table if exists pg_temp.ingredient_demands;
  create temporary table ingredient_demands (
    ingredient_id uuid primary key,
    quantity_required numeric(12, 3) not null
  ) on commit drop;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := greatest(coalesce((item ->> 'quantity')::integer, 0), 0);
    addon_total_per_unit := 0;

    if qty <= 0 then
      raise exception 'Each line item quantity must be greater than zero.';
    end if;

    select product_row.*
    into selected_product
    from public.products as product_row
    where product_row.id = (item ->> 'product_id')::uuid
      and product_row.is_active = true;

    if selected_product.id is null then
      raise exception 'One or more products are unavailable.';
    end if;

    select count(*)
    into recipe_count
    from public.product_ingredients as recipe
    where recipe.product_id = selected_product.id;

    if recipe_count = 0 then
      if selected_product.stock_quantity < qty then
        raise exception 'Insufficient stock for %.', selected_product.name;
      end if;
    else
      insert into ingredient_demands (ingredient_id, quantity_required)
      select recipe.ingredient_id, round(sum(recipe.quantity_required * qty), 3)
      from public.product_ingredients as recipe
      where recipe.product_id = selected_product.id
      group by recipe.ingredient_id
      on conflict (ingredient_id) do update
      set quantity_required = ingredient_demands.quantity_required + excluded.quantity_required;
    end if;

    if item ? 'addons' then
      if jsonb_typeof(item -> 'addons') <> 'array' then
        raise exception 'Add-ons must be provided as an array.';
      end if;

      for addon_item in select * from jsonb_array_elements(item -> 'addons')
      loop
        addon_qty := greatest(coalesce((addon_item ->> 'quantity')::integer, 1), 0);

        if addon_qty <= 0 then
          raise exception 'Each add-on quantity must be greater than zero.';
        end if;

        select addon_row.*
        into selected_addon
        from public.product_addons as addon_row
        join public.product_addon_links as addon_link on addon_link.addon_id = addon_row.id
        where addon_row.id = (addon_item ->> 'addon_id')::uuid
          and addon_link.product_id = selected_product.id
          and addon_row.is_active = true;

        if selected_addon.id is null then
          raise exception 'One or more add-ons are unavailable for %.', selected_product.name;
        end if;

        addon_total_per_unit := addon_total_per_unit + (selected_addon.price_delta * addon_qty);

        insert into ingredient_demands (ingredient_id, quantity_required)
        select addon_ingredient.ingredient_id, round(sum(addon_ingredient.quantity_required * addon_qty * qty), 3)
        from public.product_addon_ingredients as addon_ingredient
        where addon_ingredient.addon_id = selected_addon.id
        group by addon_ingredient.ingredient_id
        on conflict (ingredient_id) do update
        set quantity_required = ingredient_demands.quantity_required + excluded.quantity_required;
      end loop;
    end if;

    computed_subtotal := computed_subtotal + ((selected_product.price_amount + addon_total_per_unit) * qty);
  end loop;

  for demand_row in
    select demand.ingredient_id, demand.quantity_required
    from ingredient_demands as demand
  loop
    select ingredient_row.*
    into selected_ingredient
    from public.ingredients as ingredient_row
    where ingredient_row.id = demand_row.ingredient_id
      and ingredient_row.is_active = true
    for update;

    if selected_ingredient.id is null then
      raise exception 'One or more recipe ingredients are unavailable.';
    end if;

    if selected_ingredient.quantity_on_hand < demand_row.quantity_required then
      raise exception 'Insufficient ingredient stock for %.', selected_ingredient.name;
    end if;
  end loop;

  if p_discount_id is not null then
    select discount_row.*
    into selected_discount
    from public.discounts as discount_row
    where discount_row.id = p_discount_id
      and discount_row.is_active = true
      and (discount_row.expires_at is null or discount_row.expires_at >= timezone('utc', now()));

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
    addon_total_per_unit := 0;

    select product_row.*
    into selected_product
    from public.products as product_row
    where product_row.id = (item ->> 'product_id')::uuid;

    if item ? 'addons' then
      for addon_item in select * from jsonb_array_elements(item -> 'addons')
      loop
        addon_qty := greatest(coalesce((addon_item ->> 'quantity')::integer, 1), 0);

        select addon_row.*
        into selected_addon
        from public.product_addons as addon_row
        join public.product_addon_links as addon_link on addon_link.addon_id = addon_row.id
        where addon_row.id = (addon_item ->> 'addon_id')::uuid
          and addon_link.product_id = selected_product.id
          and addon_row.is_active = true;

        addon_total_per_unit := addon_total_per_unit + (selected_addon.price_delta * addon_qty);
      end loop;
    end if;

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
      (selected_product.price_amount + addon_total_per_unit) * qty
    )
    returning id into new_order_item_id;

    if item ? 'addons' then
      for addon_item in select * from jsonb_array_elements(item -> 'addons')
      loop
        addon_qty := greatest(coalesce((addon_item ->> 'quantity')::integer, 1), 0);

        select addon_row.*
        into selected_addon
        from public.product_addons as addon_row
        join public.product_addon_links as addon_link on addon_link.addon_id = addon_row.id
        where addon_row.id = (addon_item ->> 'addon_id')::uuid
          and addon_link.product_id = selected_product.id
          and addon_row.is_active = true;

        insert into public.order_item_addons (
          order_item_id,
          addon_id,
          addon_name,
          price_delta,
          quantity
        )
        values (
          new_order_item_id,
          selected_addon.id,
          selected_addon.name,
          selected_addon.price_delta,
          addon_qty
        );
      end loop;
    end if;

    select count(*)
    into recipe_count
    from public.product_ingredients as recipe
    where recipe.product_id = selected_product.id;

    if recipe_count = 0 then
      previous_quantity := selected_product.stock_quantity;

      update public.products as product_row
      set stock_quantity = product_row.stock_quantity - qty
      where product_row.id = selected_product.id
      returning product_row.stock_quantity into selected_product.stock_quantity;

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
    end if;
  end loop;

  for demand_row in
    select demand.ingredient_id, demand.quantity_required
    from ingredient_demands as demand
  loop
    select ingredient_row.*
    into selected_ingredient
    from public.ingredients as ingredient_row
    where ingredient_row.id = demand_row.ingredient_id
    for update;

    previous_ingredient_quantity := selected_ingredient.quantity_on_hand;
    next_ingredient_quantity := previous_ingredient_quantity - demand_row.quantity_required;

    if next_ingredient_quantity < 0 then
      raise exception 'Insufficient ingredient stock for %.', selected_ingredient.name;
    end if;

    update public.ingredients as ingredient_row
    set quantity_on_hand = next_ingredient_quantity
    where ingredient_row.id = selected_ingredient.id;

    insert into public.ingredient_adjustments (
      ingredient_id,
      user_id,
      adjustment_type,
      quantity_delta,
      previous_quantity,
      new_quantity,
      reason,
      reference_order_id
    )
    values (
      selected_ingredient.id,
      auth.uid(),
      'sale',
      demand_row.quantity_required * -1,
      previous_ingredient_quantity,
      next_ingredient_quantity,
      format('Used for order %s', new_order.order_number),
      new_order.id
    );
  end loop;

  return query
  select new_order.id, new_order.order_number, new_order.grand_total;
end;
$$;

revoke all on function private.adjust_ingredient_impl(uuid, numeric, text, text) from public;
revoke all on function public.adjust_ingredient(uuid, numeric, text, text) from public;
grant execute on function private.adjust_ingredient_impl(uuid, numeric, text, text) to authenticated;
grant execute on function public.adjust_ingredient(uuid, numeric, text, text) to authenticated;

revoke all on function private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text) from public;
grant execute on function private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text) to authenticated;

with ingredient_seed (sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier) as (
  values
    ('ING-BEAN-001', 'Coffee Beans', 'Coffee', 'g', 5000::numeric, 1000::numeric, 0.8500::numeric, 'House Roastery'),
    ('ING-MILK-002', 'Fresh Milk', 'Dairy', 'ml', 10000, 2000, 0.0900, 'Local Dairy'),
    ('ING-CHOCO-003', 'Chocolate Syrup', 'Syrups', 'ml', 3000, 500, 0.1800, 'Cafe Pantry'),
    ('ING-MATCHA-004', 'Matcha Powder', 'Tea', 'g', 1000, 200, 1.8000, 'Tea Supplier'),
    ('ING-SUGAR-005', 'Sugar Syrup', 'Syrups', 'ml', 3000, 500, 0.0600, 'Cafe Pantry'),
    ('ING-ICE-006', 'Ice', 'Cold Bar', 'g', 10000, 2000, 0.0100, 'In-house'),
    ('ING-CUP-007', '12oz Cup', 'Packaging', 'pcs', 500, 100, 4.5000, 'Packaging Partner'),
    ('ING-LID-008', 'Lid', 'Packaging', 'pcs', 500, 100, 2.5000, 'Packaging Partner'),
    ('ING-CRO-009', 'Croissant Dough', 'Pastry Prep', 'pcs', 30, 10, 38.0000, 'Bakery Prep'),
    ('ING-MUF-010', 'Muffin Batter', 'Pastry Prep', 'pcs', 25, 10, 42.0000, 'Bakery Prep'),
    ('ING-CAKE-011', 'Cake Slice Base', 'Pastry Prep', 'pcs', 20, 5, 65.0000, 'Bakery Prep'),
    ('ING-SAND-012', 'Sandwich Kit', 'Kitchen Prep', 'pcs', 20, 5, 95.0000, 'Kitchen Prep')
)
insert into public.ingredients (sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, is_active)
select sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, true
from ingredient_seed
on conflict (sku) do update
set
  name = excluded.name,
  category = excluded.category,
  unit = excluded.unit,
  quantity_on_hand = greatest(public.ingredients.quantity_on_hand, excluded.quantity_on_hand),
  low_stock_threshold = excluded.low_stock_threshold,
  cost_per_unit = excluded.cost_per_unit,
  supplier = excluded.supplier,
  is_active = excluded.is_active;

with recipe_seed (product_sku, ingredient_name, quantity_required) as (
  values
    ('COF-ESP-001', 'Coffee Beans', 18::numeric),
    ('COF-ESP-001', '12oz Cup', 1),
    ('COF-AMR-002', 'Coffee Beans', 18),
    ('COF-AMR-002', '12oz Cup', 1),
    ('COF-AMR-002', 'Lid', 1),
    ('COF-LAT-003', 'Coffee Beans', 18),
    ('COF-LAT-003', 'Fresh Milk', 180),
    ('COF-LAT-003', '12oz Cup', 1),
    ('COF-LAT-003', 'Lid', 1),
    ('COF-CAP-004', 'Coffee Beans', 18),
    ('COF-CAP-004', 'Fresh Milk', 140),
    ('COF-CAP-004', '12oz Cup', 1),
    ('COF-CAP-004', 'Lid', 1),
    ('COF-MOC-005', 'Coffee Beans', 18),
    ('COF-MOC-005', 'Fresh Milk', 160),
    ('COF-MOC-005', 'Chocolate Syrup', 30),
    ('COF-MOC-005', '12oz Cup', 1),
    ('COF-MOC-005', 'Lid', 1),
    ('COF-MAT-006', 'Matcha Powder', 8),
    ('COF-MAT-006', 'Fresh Milk', 180),
    ('COF-MAT-006', 'Sugar Syrup', 20),
    ('COF-MAT-006', '12oz Cup', 1),
    ('COF-MAT-006', 'Lid', 1),
    ('COF-ICE-007', 'Coffee Beans', 18),
    ('COF-ICE-007', 'Ice', 180),
    ('COF-ICE-007', 'Sugar Syrup', 20),
    ('COF-ICE-007', '12oz Cup', 1),
    ('COF-ICE-007', 'Lid', 1),
    ('COF-FRP-008', 'Chocolate Syrup', 50),
    ('COF-FRP-008', 'Fresh Milk', 120),
    ('COF-FRP-008', 'Ice', 220),
    ('COF-FRP-008', '12oz Cup', 1),
    ('COF-FRP-008', 'Lid', 1),
    ('PAS-CRO-009', 'Croissant Dough', 1),
    ('PAS-MUF-010', 'Muffin Batter', 1),
    ('PAS-CAK-011', 'Cake Slice Base', 1),
    ('KIT-SAN-012', 'Sandwich Kit', 1)
)
insert into public.product_ingredients (product_id, ingredient_id, quantity_required)
select product_row.id, ingredient_row.id, recipe_seed.quantity_required
from recipe_seed
join public.products as product_row on product_row.sku = recipe_seed.product_sku
join public.ingredients as ingredient_row on ingredient_row.name = recipe_seed.ingredient_name
on conflict (product_id, ingredient_id) do update
set quantity_required = excluded.quantity_required;

with addon_seed (sku, name, description, price_delta) as (
  values
    ('ADD-ESP-SHOT', 'Extra Espresso Shot', 'Adds another espresso pull to the drink.', 25::numeric),
    ('ADD-SUGAR', 'Extra Sugar Syrup', 'Adds a sweeter cafe syrup pour.', 10),
    ('ADD-MILK', 'Extra Milk', 'Adds a creamier milk pour.', 15),
    ('ADD-CHOCO', 'Chocolate Drizzle', 'Adds chocolate syrup finish.', 20),
    ('ADD-ICE', 'Extra Ice', 'Adds more ice for cold drinks.', 5),
    ('ADD-CUP', 'Extra Cup', 'Adds an extra cup and lid.', 10)
)
insert into public.product_addons (sku, name, description, price_delta, is_active)
select sku, name, description, price_delta, true
from addon_seed
on conflict (sku) do update
set
  name = excluded.name,
  description = excluded.description,
  price_delta = excluded.price_delta,
  is_active = excluded.is_active;

with addon_ingredient_seed (addon_sku, ingredient_name, quantity_required) as (
  values
    ('ADD-ESP-SHOT', 'Coffee Beans', 18::numeric),
    ('ADD-SUGAR', 'Sugar Syrup', 20),
    ('ADD-MILK', 'Fresh Milk', 80),
    ('ADD-CHOCO', 'Chocolate Syrup', 25),
    ('ADD-ICE', 'Ice', 100),
    ('ADD-CUP', '12oz Cup', 1),
    ('ADD-CUP', 'Lid', 1)
)
insert into public.product_addon_ingredients (addon_id, ingredient_id, quantity_required)
select addon_row.id, ingredient_row.id, addon_ingredient_seed.quantity_required
from addon_ingredient_seed
join public.product_addons as addon_row on addon_row.sku = addon_ingredient_seed.addon_sku
join public.ingredients as ingredient_row on ingredient_row.name = addon_ingredient_seed.ingredient_name
on conflict (addon_id, ingredient_id) do update
set quantity_required = excluded.quantity_required;

with link_seed (product_sku, addon_sku) as (
  values
    ('COF-ESP-001', 'ADD-ESP-SHOT'),
    ('COF-ESP-001', 'ADD-SUGAR'),
    ('COF-ESP-001', 'ADD-MILK'),
    ('COF-ESP-001', 'ADD-ICE'),
    ('COF-ESP-001', 'ADD-CUP'),
    ('COF-AMR-002', 'ADD-ESP-SHOT'),
    ('COF-AMR-002', 'ADD-SUGAR'),
    ('COF-AMR-002', 'ADD-MILK'),
    ('COF-AMR-002', 'ADD-ICE'),
    ('COF-AMR-002', 'ADD-CUP'),
    ('COF-LAT-003', 'ADD-ESP-SHOT'),
    ('COF-LAT-003', 'ADD-SUGAR'),
    ('COF-LAT-003', 'ADD-MILK'),
    ('COF-LAT-003', 'ADD-ICE'),
    ('COF-LAT-003', 'ADD-CUP'),
    ('COF-CAP-004', 'ADD-ESP-SHOT'),
    ('COF-CAP-004', 'ADD-SUGAR'),
    ('COF-CAP-004', 'ADD-MILK'),
    ('COF-CAP-004', 'ADD-ICE'),
    ('COF-CAP-004', 'ADD-CUP'),
    ('COF-MOC-005', 'ADD-ESP-SHOT'),
    ('COF-MOC-005', 'ADD-SUGAR'),
    ('COF-MOC-005', 'ADD-MILK'),
    ('COF-MOC-005', 'ADD-ICE'),
    ('COF-MOC-005', 'ADD-CUP'),
    ('COF-MOC-005', 'ADD-CHOCO'),
    ('COF-MAT-006', 'ADD-SUGAR'),
    ('COF-MAT-006', 'ADD-MILK'),
    ('COF-MAT-006', 'ADD-ICE'),
    ('COF-MAT-006', 'ADD-CUP'),
    ('COF-ICE-007', 'ADD-ESP-SHOT'),
    ('COF-ICE-007', 'ADD-SUGAR'),
    ('COF-ICE-007', 'ADD-MILK'),
    ('COF-ICE-007', 'ADD-ICE'),
    ('COF-ICE-007', 'ADD-CUP'),
    ('COF-FRP-008', 'ADD-ESP-SHOT'),
    ('COF-FRP-008', 'ADD-SUGAR'),
    ('COF-FRP-008', 'ADD-MILK'),
    ('COF-FRP-008', 'ADD-ICE'),
    ('COF-FRP-008', 'ADD-CUP'),
    ('COF-FRP-008', 'ADD-CHOCO')
)
insert into public.product_addon_links (product_id, addon_id)
select product_row.id, addon_row.id
from link_seed
join public.products as product_row on product_row.sku = link_seed.product_sku
join public.product_addons as addon_row on addon_row.sku = link_seed.addon_sku
on conflict (product_id, addon_id) do nothing;
