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
  select new_order.id, new_order.order_number, new_order.grand_total;
end;
$$;
