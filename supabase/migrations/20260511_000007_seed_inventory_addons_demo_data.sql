with ingredient_seed (name, sku, category, unit, quantity_on_hand, low_stock_threshold) as (
  values
    ('Coffee Beans', 'ING-COFFEE-BEANS', 'Coffee', 'g', 5000::numeric, 1000::numeric),
    ('Fresh Milk', 'ING-FRESH-MILK', 'Dairy', 'ml', 10000::numeric, 2000::numeric),
    ('Chocolate Syrup', 'ING-CHOCOLATE-SYRUP', 'Syrups', 'ml', 3000::numeric, 500::numeric),
    ('Matcha Powder', 'ING-MATCHA-POWDER', 'Tea', 'g', 1000::numeric, 200::numeric),
    ('Sugar Syrup', 'ING-SUGAR-SYRUP', 'Syrups', 'ml', 3000::numeric, 500::numeric),
    ('Ice', 'ING-ICE', 'Cold Bar', 'g', 10000::numeric, 2000::numeric),
    ('12oz Cup', 'ING-12OZ-CUP', 'Packaging', 'pcs', 500::numeric, 100::numeric),
    ('Lid', 'ING-LID', 'Packaging', 'pcs', 500::numeric, 100::numeric),
    ('Croissant Dough', 'ING-CROISSANT-DOUGH', 'Pastry Prep', 'pcs', 30::numeric, 10::numeric),
    ('Muffin Batter', 'ING-MUFFIN-BATTER', 'Pastry Prep', 'pcs', 25::numeric, 10::numeric),
    ('Cake Slice Base', 'ING-CAKE-SLICE-BASE', 'Pastry Prep', 'pcs', 20::numeric, 5::numeric),
    ('Sandwich Kit', 'ING-SANDWICH-KIT', 'Kitchen Prep', 'pcs', 20::numeric, 5::numeric)
)
insert into public.ingredients (
  name,
  sku,
  category,
  unit,
  quantity_on_hand,
  low_stock_threshold,
  is_active
)
select
  ingredient_seed.name,
  ingredient_seed.sku,
  ingredient_seed.category,
  ingredient_seed.unit,
  ingredient_seed.quantity_on_hand,
  ingredient_seed.low_stock_threshold,
  true
from ingredient_seed
on conflict (sku) do update
set
  name = excluded.name,
  category = excluded.category,
  unit = excluded.unit,
  quantity_on_hand = excluded.quantity_on_hand,
  low_stock_threshold = excluded.low_stock_threshold,
  is_active = excluded.is_active;

with recipe_seed (product_sku, ingredient_sku, quantity_required) as (
  values
    ('COF-ESP-001', 'ING-COFFEE-BEANS', 18::numeric),
    ('COF-ESP-001', 'ING-12OZ-CUP', 1::numeric),
    ('COF-AMR-002', 'ING-COFFEE-BEANS', 18::numeric),
    ('COF-AMR-002', 'ING-12OZ-CUP', 1::numeric),
    ('COF-AMR-002', 'ING-LID', 1::numeric),
    ('COF-LAT-003', 'ING-COFFEE-BEANS', 18::numeric),
    ('COF-LAT-003', 'ING-FRESH-MILK', 180::numeric),
    ('COF-LAT-003', 'ING-12OZ-CUP', 1::numeric),
    ('COF-LAT-003', 'ING-LID', 1::numeric),
    ('COF-CAP-004', 'ING-COFFEE-BEANS', 18::numeric),
    ('COF-CAP-004', 'ING-FRESH-MILK', 140::numeric),
    ('COF-CAP-004', 'ING-12OZ-CUP', 1::numeric),
    ('COF-CAP-004', 'ING-LID', 1::numeric),
    ('COF-MOC-005', 'ING-COFFEE-BEANS', 18::numeric),
    ('COF-MOC-005', 'ING-FRESH-MILK', 160::numeric),
    ('COF-MOC-005', 'ING-CHOCOLATE-SYRUP', 30::numeric),
    ('COF-MOC-005', 'ING-12OZ-CUP', 1::numeric),
    ('COF-MOC-005', 'ING-LID', 1::numeric),
    ('COF-MAT-006', 'ING-MATCHA-POWDER', 8::numeric),
    ('COF-MAT-006', 'ING-FRESH-MILK', 180::numeric),
    ('COF-MAT-006', 'ING-SUGAR-SYRUP', 20::numeric),
    ('COF-MAT-006', 'ING-12OZ-CUP', 1::numeric),
    ('COF-MAT-006', 'ING-LID', 1::numeric),
    ('COF-ICE-007', 'ING-COFFEE-BEANS', 18::numeric),
    ('COF-ICE-007', 'ING-ICE', 180::numeric),
    ('COF-ICE-007', 'ING-SUGAR-SYRUP', 20::numeric),
    ('COF-ICE-007', 'ING-12OZ-CUP', 1::numeric),
    ('COF-ICE-007', 'ING-LID', 1::numeric),
    ('COF-FRP-008', 'ING-CHOCOLATE-SYRUP', 50::numeric),
    ('COF-FRP-008', 'ING-FRESH-MILK', 120::numeric),
    ('COF-FRP-008', 'ING-ICE', 220::numeric),
    ('COF-FRP-008', 'ING-12OZ-CUP', 1::numeric),
    ('COF-FRP-008', 'ING-LID', 1::numeric),
    ('PAS-CRO-009', 'ING-CROISSANT-DOUGH', 1::numeric),
    ('PAS-MUF-010', 'ING-MUFFIN-BATTER', 1::numeric),
    ('PAS-CAK-011', 'ING-CAKE-SLICE-BASE', 1::numeric),
    ('KIT-SAN-012', 'ING-SANDWICH-KIT', 1::numeric)
)
insert into public.product_ingredients (
  product_id,
  ingredient_id,
  quantity_required
)
select
  product_row.id,
  ingredient_row.id,
  recipe_seed.quantity_required
from recipe_seed
join public.products as product_row
  on product_row.sku = recipe_seed.product_sku
join public.ingredients as ingredient_row
  on ingredient_row.sku = recipe_seed.ingredient_sku
on conflict (product_id, ingredient_id) do update
set quantity_required = excluded.quantity_required;

with addon_seed (sku, name, description, price_delta) as (
  values
    ('ADD-ESP-SHOT', 'Extra Espresso Shot', 'Adds another espresso pull to the drink.', 25::numeric),
    ('ADD-SUGAR', 'Extra Sugar Syrup', 'Adds a sweeter cafe syrup pour.', 10::numeric),
    ('ADD-MILK', 'Extra Milk', 'Adds a creamier milk pour.', 15::numeric),
    ('ADD-CHOCO', 'Chocolate Drizzle', 'Adds chocolate syrup finish.', 20::numeric),
    ('ADD-ICE', 'Extra Ice', 'Adds more ice for cold drinks.', 5::numeric),
    ('ADD-CUP', 'Extra Cup', 'Adds an extra cup and lid.', 10::numeric)
)
insert into public.product_addons (
  sku,
  name,
  description,
  price_delta,
  is_active
)
select
  addon_seed.sku,
  addon_seed.name,
  addon_seed.description,
  addon_seed.price_delta,
  true
from addon_seed
on conflict (sku) do update
set
  name = excluded.name,
  description = excluded.description,
  price_delta = excluded.price_delta,
  is_active = excluded.is_active;

with addon_ingredient_seed (addon_sku, ingredient_sku, quantity_required) as (
  values
    ('ADD-ESP-SHOT', 'ING-COFFEE-BEANS', 18::numeric),
    ('ADD-SUGAR', 'ING-SUGAR-SYRUP', 20::numeric),
    ('ADD-MILK', 'ING-FRESH-MILK', 80::numeric),
    ('ADD-CHOCO', 'ING-CHOCOLATE-SYRUP', 25::numeric),
    ('ADD-ICE', 'ING-ICE', 100::numeric),
    ('ADD-CUP', 'ING-12OZ-CUP', 1::numeric),
    ('ADD-CUP', 'ING-LID', 1::numeric)
)
insert into public.product_addon_ingredients (
  addon_id,
  ingredient_id,
  quantity_required
)
select
  addon_row.id,
  ingredient_row.id,
  addon_ingredient_seed.quantity_required
from addon_ingredient_seed
join public.product_addons as addon_row
  on addon_row.sku = addon_ingredient_seed.addon_sku
join public.ingredients as ingredient_row
  on ingredient_row.sku = addon_ingredient_seed.ingredient_sku
on conflict (addon_id, ingredient_id) do update
set quantity_required = excluded.quantity_required;

with addon_link_seed (product_sku, addon_sku) as (
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
insert into public.product_addon_links (
  product_id,
  addon_id
)
select
  product_row.id,
  addon_row.id
from addon_link_seed
join public.products as product_row
  on product_row.sku = addon_link_seed.product_sku
join public.product_addons as addon_row
  on addon_row.sku = addon_link_seed.addon_sku
on conflict (product_id, addon_id) do nothing;

-- Verification
select count(*) from public.ingredients;
select count(*) from public.product_ingredients;
select count(*) from public.product_addons;
select count(*) from public.product_addon_links;
