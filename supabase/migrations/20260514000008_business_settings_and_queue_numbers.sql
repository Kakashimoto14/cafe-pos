create schema if not exists private;

create table if not exists public.business_settings (
  settings_key text primary key default 'default' check (settings_key = 'default'),
  store_name text not null default 'Cozy Cafe',
  branch_name text not null default 'Main Counter',
  contact_number text not null default '+63 917 000 0000',
  email text not null default 'hello@cozycafe.local',
  address text not null default '123 Espresso Lane, Manila',
  business_info text not null default 'VAT Registered / TIN available on official receipt',
  logo_url text,
  receipt_header text not null default 'Cozy Cafe POS',
  receipt_footer text not null default 'Thank you for visiting Cozy Cafe.',
  receipt_notes text not null default 'Please come again soon.',
  show_logo boolean not null default true,
  show_cashier_name boolean not null default true,
  show_order_number boolean not null default true,
  show_queue_number boolean not null default true,
  tax_label text not null default 'VAT',
  tax_rate numeric(5, 2) not null default 12 check (tax_rate >= 0 and tax_rate <= 100),
  currency text not null default 'PHP',
  default_order_type public.order_channel not null default 'dine_in',
  stock_warning boolean not null default true,
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  require_payment_reference boolean not null default true,
  auto_print_receipt boolean not null default false,
  senior_discount boolean not null default true,
  pwd_discount boolean not null default true,
  default_discount_percent numeric(5, 2) not null default 20 check (default_discount_percent >= 0 and default_discount_percent <= 100),
  promo_codes boolean not null default true,
  manual_discount_roles text not null default 'Admin, Manager',
  compact_mode boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.business_settings (settings_key)
values ('default')
on conflict (settings_key) do nothing;

alter table public.business_settings enable row level security;

grant select, insert, update on public.business_settings to authenticated;

drop policy if exists "business_settings_authenticated_read" on public.business_settings;
create policy "business_settings_authenticated_read"
on public.business_settings
for select
to authenticated
using (true);

drop policy if exists "business_settings_authenticated_insert" on public.business_settings;
create policy "business_settings_authenticated_insert"
on public.business_settings
for insert
to authenticated
with check (true);

drop policy if exists "business_settings_authenticated_update" on public.business_settings;
create policy "business_settings_authenticated_update"
on public.business_settings
for update
to authenticated
using (true)
with check (true);

drop trigger if exists set_business_settings_updated_at on public.business_settings;
create trigger set_business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

create table if not exists private.order_queue_counters (
  business_date date primary key,
  last_value integer not null default 0 check (last_value >= 0)
);

alter table public.orders
  add column if not exists queue_number text,
  add column if not exists queue_sequence integer,
  add column if not exists queue_business_date date,
  add column if not exists customer_email text,
  add column if not exists receipt_settings_snapshot jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_queue_sequence_positive'
  ) then
    alter table public.orders
      add constraint orders_queue_sequence_positive
      check (queue_sequence is null or queue_sequence > 0);
  end if;
end $$;

create unique index if not exists orders_queue_business_day_sequence_uidx
  on public.orders (queue_business_date, queue_sequence)
  where queue_business_date is not null and queue_sequence is not null;

create unique index if not exists orders_queue_business_day_number_uidx
  on public.orders (queue_business_date, queue_number)
  where queue_business_date is not null and queue_number is not null;

drop function if exists public.create_order(text, text, text, jsonb, uuid, numeric, text, text);
drop function if exists private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text);

create or replace function private.create_order_impl(
  p_order_type text,
  p_payment_method text,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb,
  p_discount_id uuid default null,
  p_amount_paid numeric default null,
  p_payment_reference text default null,
  p_payment_notes text default null,
  p_customer_email text default null
)
returns table (
  id uuid,
  order_number text,
  grand_total numeric,
  queue_number text
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
  active_business_settings public.business_settings%rowtype;
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
  normalized_customer_email text := nullif(lower(trim(coalesce(p_customer_email, ''))), '');
  business_day date := timezone('Asia/Manila', now())::date;
  next_queue_sequence integer;
  generated_queue_number text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated session required.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one line item is required.';
  end if;

  if normalized_customer_email is not null
    and normalized_customer_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid customer email address.';
  end if;

  select profile.role
  into active_role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true;

  if active_role is null then
    raise exception 'Active operator profile required.';
  end if;

  select business_settings_row.*
  into active_business_settings
  from public.business_settings as business_settings_row
  where business_settings_row.settings_key = 'default';

  if active_business_settings.settings_key is null then
    insert into public.business_settings (settings_key)
    values ('default')
    returning * into active_business_settings;
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
  computed_tax := round(taxable_subtotal * (coalesce(active_business_settings.tax_rate, 12) / 100), 2);
  computed_total := taxable_subtotal + computed_tax;

  if p_payment_method::public.payment_method = 'cash' then
    computed_amount_paid := round(coalesce(p_amount_paid, 0), 2);

    if computed_amount_paid < computed_total then
      raise exception 'Cash tendered must cover the order total.';
    end if;

    computed_change := round(computed_amount_paid - computed_total, 2);
  else
    if coalesce(active_business_settings.require_payment_reference, true)
      and p_payment_method::public.payment_method in ('gcash', 'qr', 'instapay')
      and normalized_reference is null then
      raise exception 'A payment reference is required for the selected payment method.';
    end if;

    computed_amount_paid := computed_total;
    computed_change := 0;
  end if;

  insert into private.order_queue_counters as queue_counter (business_date, last_value)
  values (business_day, 1)
  on conflict (business_date) do update
  set last_value = queue_counter.last_value + 1
  returning queue_counter.last_value into next_queue_sequence;

  generated_queue_number := 'Q' || lpad(next_queue_sequence::text, 3, '0');

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
    payment_notes,
    queue_number,
    queue_sequence,
    queue_business_date,
    customer_email,
    receipt_settings_snapshot
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
    normalized_payment_notes,
    generated_queue_number,
    next_queue_sequence,
    business_day,
    normalized_customer_email,
    jsonb_build_object(
      'storeName', active_business_settings.store_name,
      'branchName', active_business_settings.branch_name,
      'contactNumber', active_business_settings.contact_number,
      'email', active_business_settings.email,
      'address', active_business_settings.address,
      'businessInfo', active_business_settings.business_info,
      'logoUrl', coalesce(active_business_settings.logo_url, ''),
      'receiptHeader', active_business_settings.receipt_header,
      'receiptFooter', active_business_settings.receipt_footer,
      'receiptNotes', active_business_settings.receipt_notes,
      'showLogo', active_business_settings.show_logo,
      'showCashierName', active_business_settings.show_cashier_name,
      'showOrderNumber', active_business_settings.show_order_number,
      'showQueueNumber', active_business_settings.show_queue_number,
      'taxLabel', active_business_settings.tax_label,
      'taxRate', active_business_settings.tax_rate,
      'currency', active_business_settings.currency,
      'defaultOrderType', active_business_settings.default_order_type,
      'stockWarning', active_business_settings.stock_warning,
      'lowStockThreshold', active_business_settings.low_stock_threshold,
      'requirePaymentReference', active_business_settings.require_payment_reference,
      'autoPrintReceipt', active_business_settings.auto_print_receipt,
      'seniorDiscount', active_business_settings.senior_discount,
      'pwdDiscount', active_business_settings.pwd_discount,
      'defaultDiscountPercent', active_business_settings.default_discount_percent,
      'promoCodes', active_business_settings.promo_codes,
      'manualDiscountRoles', active_business_settings.manual_discount_roles,
      'compactMode', active_business_settings.compact_mode
    )
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

    insert into public.order_items as order_item_row (
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
    returning order_item_row.id into new_order_item_id;

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
  select new_order.id, new_order.order_number, new_order.grand_total, new_order.queue_number;
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
  p_payment_notes text default null,
  p_customer_email text default null
)
returns table (
  id uuid,
  order_number text,
  grand_total numeric,
  queue_number text
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
    p_payment_notes,
    p_customer_email
  );
$$;

revoke all on function private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text, text) from public;
grant execute on function private.create_order_impl(text, text, text, jsonb, uuid, numeric, text, text, text) to authenticated;

revoke all on function public.create_order(text, text, text, jsonb, uuid, numeric, text, text, text) from public;
grant execute on function public.create_order(text, text, text, jsonb, uuid, numeric, text, text, text) to authenticated;
