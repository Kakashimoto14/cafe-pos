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

  select profile.role
  into active_role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true;

  if active_role is null then
    raise exception 'Active operator profile required.';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := greatest(coalesce((item ->> 'quantity')::integer, 0), 0);

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

    if selected_product.stock_quantity < qty then
      raise exception 'Insufficient stock for %.', selected_product.name;
    end if;

    computed_subtotal := computed_subtotal + (selected_product.price_amount * qty);
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

    select product_row.*
    into selected_product
    from public.products as product_row
    where product_row.id = (item ->> 'product_id')::uuid;

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
  end loop;

  return query
  select new_order.id, new_order.order_number, new_order.grand_total;
end;
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

  select profile.role
  into active_role
  from public.profiles as profile
  where profile.id = auth.uid()
    and profile.is_active = true;

  if active_role not in ('admin', 'manager') then
    raise exception 'Only managers and admins can adjust inventory.';
  end if;

  if p_quantity_delta = 0 then
    raise exception 'Adjustment quantity must not be zero.';
  end if;

  select product_row.*
  into selected_product
  from public.products as product_row
  where product_row.id = p_product_id;

  if selected_product.id is null then
    raise exception 'Product not found.';
  end if;

  previous_quantity := selected_product.stock_quantity;
  next_quantity := previous_quantity + p_quantity_delta;

  if next_quantity < 0 then
    raise exception 'Adjustment would make stock negative.';
  end if;

  update public.products as product_row
  set stock_quantity = next_quantity
  where product_row.id = selected_product.id;

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
