create extension if not exists pg_trgm;

create index if not exists orders_cashier_created_idx on public.orders (cashier_id, created_at desc);
create index if not exists orders_order_number_trgm_idx on public.orders using gin (order_number gin_trgm_ops);
create index if not exists orders_payment_reference_trgm_idx on public.orders using gin (payment_reference gin_trgm_ops);
create index if not exists idx_orders_queue_number on public.orders (queue_number);
create index if not exists order_items_product_name_trgm_idx on public.order_items using gin (product_name gin_trgm_ops);

create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index if not exists products_sku_trgm_idx on public.products using gin (sku gin_trgm_ops);

create index if not exists ingredients_name_trgm_idx on public.ingredients using gin (name gin_trgm_ops);
create index if not exists ingredients_supplier_trgm_idx on public.ingredients using gin (supplier gin_trgm_ops);

create index if not exists discounts_name_trgm_idx on public.discounts using gin (name gin_trgm_ops);
create index if not exists discounts_code_trgm_idx on public.discounts using gin (code gin_trgm_ops);

create index if not exists profiles_full_name_trgm_idx on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists profiles_email_trgm_idx on public.profiles using gin (email gin_trgm_ops);
