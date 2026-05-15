import type { Session } from "@supabase/supabase-js";
import type {
  AuthUser,
  CafeSettings,
  CategoryFormValues,
  CategoryRecord,
  DashboardSummary,
  DiscountFormValues,
  DiscountRecord,
  IngredientAdjustmentRecord,
  IngredientAdjustmentType,
  IngredientFormValues,
  IngredientRecord,
  InventoryAdjustmentRecord,
  MenuProduct,
  OrderItemAddonRecord,
  OrderListItem,
  OrderPayload,
  ProductAddonFormValues,
  ProductAddonIngredientFormValues,
  ProductAddonIngredientRecord,
  ProductAddonLinkFormValues,
  ProductAddonLinkRecord,
  ProductAddonRecord,
  ProductFormValues,
  ProductIngredientFormValues,
  ProductIngredientRecord,
  SalesSummary
} from "@cafe/shared-types";
import { mergeCafeSettings, normalizeCafeSettingsInput } from "@/lib/cafe-settings";
import { supabase } from "@/lib/supabase";

export class SupabaseSchemaSetupError extends Error {
  constructor(message = "Supabase tables or relationships are not available yet. Apply the latest Supabase migration.") {
    super(message);
    this.name = "SupabaseSchemaSetupError";
  }
}

type SupabaseMaybeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: AuthUser["role"];
  is_active: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  description: string;
  image_url: string | null;
  price_amount: number | string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id: string;
  categories?: { name: string } | Array<{ name: string }> | null;
  product_ingredients?: Array<{ id: string }> | null;
  product_addon_links?: Array<{ id: string }> | null;
};

type DiscountRow = {
  id: string;
  code: string;
  name: string;
  scope: DiscountRecord["scope"];
  value_type: DiscountRecord["valueType"];
  value_amount: number | string;
  description: string;
  allowed_roles: DiscountRecord["allowedRoles"];
  is_active: boolean;
  expires_at: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  queue_number: string | null;
  queue_business_date: string | null;
  order_type: OrderPayload["order_type"];
  payment_method: OrderPayload["payment_method"];
  customer_email: string | null;
  notes: string | null;
  subtotal: number | string;
  discount_label: string | null;
  discount_code: string | null;
  discount_total: number | string;
  tax_total: number | string;
  grand_total: number | string;
  amount_paid: number | string;
  change_due: number | string;
  payment_reference: string | null;
  payment_notes: string | null;
  receipt_settings_snapshot: Partial<CafeSettings> | null;
  created_at: string;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  order_items?: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number | string;
    line_total: number | string;
    order_item_addons?: Array<OrderItemAddonRow>;
  }>;
};

type BusinessSettingsRow = {
  settings_key: string;
  store_name: string;
  branch_name: string;
  contact_number: string;
  email: string;
  address: string;
  business_info: string;
  logo_url: string | null;
  receipt_header: string;
  receipt_footer: string;
  receipt_notes: string;
  show_logo: boolean;
  show_cashier_name: boolean;
  show_order_number: boolean;
  show_queue_number: boolean;
  tax_label: string;
  tax_rate: number | string;
  currency: string;
  default_order_type: CafeSettings["defaultOrderType"];
  stock_warning: boolean;
  low_stock_threshold: number;
  require_payment_reference: boolean;
  auto_print_receipt: boolean;
  senior_discount: boolean;
  pwd_discount: boolean;
  default_discount_percent: number | string;
  promo_codes: boolean;
  manual_discount_roles: string;
  compact_mode: boolean;
};

type InventoryAdjustmentRow = {
  id: string;
  product_id: string;
  user_id: string;
  adjustment_type: InventoryAdjustmentRecord["adjustmentType"];
  quantity_delta: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  reference_order_id: string | null;
  created_at: string;
  products?: { name: string | null } | Array<{ name: string | null }> | null;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type IngredientRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity_on_hand: number | string;
  low_stock_threshold: number | string;
  cost_per_unit: number | string;
  supplier: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type ProductIngredientRow = {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity_required: number | string;
  created_at?: string;
  products?: { name: string | null } | Array<{ name: string | null }> | null;
  ingredients?: { name: string | null; unit: string | null; cost_per_unit: number | string | null } | Array<{
    name: string | null;
    unit: string | null;
    cost_per_unit: number | string | null;
  }> | null;
};

type IngredientAdjustmentRow = {
  id: string;
  ingredient_id: string;
  user_id: string;
  adjustment_type: IngredientAdjustmentType;
  quantity_delta: number | string;
  previous_quantity: number | string;
  new_quantity: number | string;
  reason: string | null;
  reference_order_id: string | null;
  created_at: string;
  ingredients?: { name: string | null; unit: string | null } | Array<{ name: string | null; unit: string | null }> | null;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

type ProductAddonRow = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price_delta: number | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type ProductAddonIngredientRow = {
  id: string;
  addon_id: string;
  ingredient_id: string;
  quantity_required: number | string;
  created_at?: string;
  product_addons?: { name: string | null } | Array<{ name: string | null }> | null;
  ingredients?: { name: string | null; unit: string | null; cost_per_unit: number | string | null } | Array<{
    name: string | null;
    unit: string | null;
    cost_per_unit: number | string | null;
  }> | null;
};

type ProductAddonLinkRow = {
  id: string;
  product_id: string;
  addon_id: string;
  created_at?: string;
  products?: { name: string | null } | Array<{ name: string | null }> | null;
  product_addons?: ProductAddonRow | ProductAddonRow[] | null;
};

type OrderItemAddonRow = {
  id: string;
  order_item_id: string;
  addon_id: string;
  addon_name: string;
  price_delta: number | string;
  quantity: number;
  created_at?: string;
};

export function isSetupRequiredError(error: unknown) {
  return error instanceof SupabaseSchemaSetupError;
}

function isSupabaseSchemaError(error: SupabaseMaybeError | null | undefined) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();

  return (
    error?.status === 404 ||
    ["pgrst200", "pgrst202", "pgrst204", "pgrst205"].includes((error?.code ?? "").toLowerCase()) ||
    text.includes("schema cache") ||
    text.includes("relationship") ||
    text.includes("could not find") ||
    text.includes("does not exist")
  );
}

function throwSupabaseError(error: SupabaseMaybeError | null, setupMessage?: string): never {
  if (isSupabaseSchemaError(error)) {
    throw new SupabaseSchemaSetupError(setupMessage);
  }

  throw new Error(formatSupabaseError(error));
}

function formatSupabaseError(error: { message?: string } | null) {
  return error?.message ?? "Something went wrong while talking to Supabase.";
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapProfile(row: ProfileRow): AuthUser {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active
  };
}

function mapCategory(row: CategoryRow): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    isActive: row.is_active
  };
}

function mapProduct(row: ProductRow): MenuProduct {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    category: category?.name ?? "Uncategorized",
    price: toNumber(row.price_amount),
    imageUrl: row.image_url ?? undefined,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    tags: [],
    isActive: row.is_active,
    hasRecipe: (row.product_ingredients?.length ?? 0) > 0,
    hasAddons: (row.product_addon_links?.length ?? 0) > 0
  };
}

function mapDiscount(row: DiscountRow): DiscountRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    scope: row.scope,
    valueType: row.value_type,
    valueAmount: toNumber(row.value_amount),
    description: row.description,
    allowedRoles: row.allowed_roles ?? [],
    isActive: row.is_active,
    expiresAt: row.expires_at ?? undefined
  };
}

function mapCafeSettingsRow(row: Partial<BusinessSettingsRow>): CafeSettings {
  return mergeCafeSettings({
    storeName: row.store_name,
    branchName: row.branch_name,
    contactNumber: row.contact_number,
    email: row.email,
    address: row.address,
    businessInfo: row.business_info,
    logoUrl: row.logo_url ?? "",
    receiptHeader: row.receipt_header,
    receiptFooter: row.receipt_footer,
    receiptNotes: row.receipt_notes,
    showLogo: row.show_logo,
    showCashierName: row.show_cashier_name,
    showOrderNumber: row.show_order_number,
    showQueueNumber: row.show_queue_number,
    taxLabel: row.tax_label,
    taxRate: toNumber(row.tax_rate ?? 0),
    currency: row.currency,
    defaultOrderType: row.default_order_type,
    stockWarning: row.stock_warning,
    lowStockThreshold: row.low_stock_threshold,
    requirePaymentReference: row.require_payment_reference,
    autoPrintReceipt: row.auto_print_receipt,
    seniorDiscount: row.senior_discount,
    pwdDiscount: row.pwd_discount,
    defaultDiscountPercent: toNumber(row.default_discount_percent ?? 0),
    promoCodes: row.promo_codes,
    manualDiscountRoles: row.manual_discount_roles,
    compactMode: row.compact_mode
  });
}

function mapOrder(row: OrderRow): OrderListItem {
  const cashierProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    orderNumber: row.order_number,
    queueNumber: row.queue_number ?? undefined,
    queueDate: row.queue_business_date ?? undefined,
    receiptSettings: row.receipt_settings_snapshot ? mapCafeSettingsRow(row.receipt_settings_snapshot) : undefined,
    orderType: row.order_type,
    paymentMethod: row.payment_method,
    cashierName: cashierProfile?.full_name ?? "Unknown cashier",
    customerEmail: row.customer_email ?? undefined,
    notes: row.notes ?? undefined,
    subtotal: toNumber(row.subtotal),
    discountLabel: row.discount_label ?? undefined,
    discountCode: row.discount_code ?? undefined,
    discountTotal: toNumber(row.discount_total),
    taxTotal: toNumber(row.tax_total),
    grandTotal: toNumber(row.grand_total),
    amountPaid: toNumber(row.amount_paid),
    changeDue: toNumber(row.change_due),
    paymentReference: row.payment_reference ?? undefined,
    paymentNotes: row.payment_notes ?? undefined,
    createdAt: row.created_at,
    items:
      row.order_items?.map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: toNumber(item.unit_price),
        lineTotal: toNumber(item.line_total),
        addons: item.order_item_addons?.map(mapOrderItemAddon) ?? []
      })) ?? []
  };
}

function mapIngredient(row: IngredientRow): IngredientRecord {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantityOnHand: toNumber(row.quantity_on_hand),
    lowStockThreshold: toNumber(row.low_stock_threshold),
    costPerUnit: toNumber(row.cost_per_unit),
    supplier: row.supplier ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProductIngredient(row: ProductIngredientRow): ProductIngredientRecord {
  const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
  const product = Array.isArray(row.products) ? row.products[0] : row.products;

  return {
    id: row.id,
    productId: row.product_id,
    productName: product?.name ?? undefined,
    ingredientId: row.ingredient_id,
    ingredientName: ingredient?.name ?? "Unknown ingredient",
    ingredientUnit: ingredient?.unit ?? "",
    quantityRequired: toNumber(row.quantity_required),
    costPerUnit: toNumber(ingredient?.cost_per_unit),
    createdAt: row.created_at
  };
}

function mapIngredientAdjustment(row: IngredientAdjustmentRow): IngredientAdjustmentRecord {
  const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    ingredientName: ingredient?.name ?? "Unknown ingredient",
    ingredientUnit: ingredient?.unit ?? "",
    userId: row.user_id,
    userName: profile?.full_name ?? "Unknown user",
    adjustmentType: row.adjustment_type,
    quantityDelta: toNumber(row.quantity_delta),
    previousQuantity: toNumber(row.previous_quantity),
    newQuantity: toNumber(row.new_quantity),
    reason: row.reason ?? undefined,
    referenceOrderId: row.reference_order_id ?? undefined,
    createdAt: row.created_at
  };
}

function mapProductAddon(row: ProductAddonRow): ProductAddonRecord {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description ?? undefined,
    priceDelta: toNumber(row.price_delta),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAddonIngredient(row: ProductAddonIngredientRow): ProductAddonIngredientRecord {
  const addon = Array.isArray(row.product_addons) ? row.product_addons[0] : row.product_addons;
  const ingredient = Array.isArray(row.ingredients) ? row.ingredients[0] : row.ingredients;

  return {
    id: row.id,
    addonId: row.addon_id,
    addonName: addon?.name ?? undefined,
    ingredientId: row.ingredient_id,
    ingredientName: ingredient?.name ?? "Unknown ingredient",
    ingredientUnit: ingredient?.unit ?? "",
    quantityRequired: toNumber(row.quantity_required),
    costPerUnit: toNumber(ingredient?.cost_per_unit),
    createdAt: row.created_at
  };
}

function mapProductAddonLink(row: ProductAddonLinkRow): ProductAddonLinkRecord {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;
  const addon = Array.isArray(row.product_addons) ? row.product_addons[0] : row.product_addons;

  return {
    id: row.id,
    productId: row.product_id,
    productName: product?.name ?? "Unknown product",
    addonId: row.addon_id,
    addonName: addon?.name ?? "Unknown add-on",
    createdAt: row.created_at
  };
}

function mapOrderItemAddon(row: OrderItemAddonRow): OrderItemAddonRecord {
  return {
    id: row.id,
    orderItemId: row.order_item_id,
    addonId: row.addon_id,
    addonName: row.addon_name,
    priceDelta: toNumber(row.price_delta),
    quantity: row.quantity,
    createdAt: row.created_at
  };
}

function mapInventoryAdjustment(row: InventoryAdjustmentRow): InventoryAdjustmentRecord {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    productId: row.product_id,
    productName: product?.name ?? "Unknown product",
    userId: row.user_id,
    userName: profile?.full_name ?? "Unknown user",
    adjustmentType: row.adjustment_type,
    quantityDelta: row.quantity_delta,
    previousQuantity: row.previous_quantity,
    newQuantity: row.new_quantity,
    reason: row.reason ?? undefined,
    referenceOrderId: row.reference_order_id ?? undefined,
    createdAt: row.created_at
  };
}

async function getProfileForSession(session: Session) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", session.user.id)
    .single();

  if (error || !data) {
    throw new Error(formatSupabaseError(error));
  }

  const user = mapProfile(data as ProfileRow);

  if (!user.isActive) {
    await supabase.auth.signOut();
    throw new Error("This account is inactive. Contact an administrator.");
  }

  return user;
}

async function getSessionProfile() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  if (!session) {
    return { session: null, user: null };
  }

  const user = await getProfileForSession(session);
  return { session, user };
}

async function login(payload: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword(payload);

  if (error || !data.session) {
    throw new Error(formatSupabaseError(error));
  }

  const user = await getProfileForSession(data.session);
  return { session: data.session, user };
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

async function products(options: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("products")
    .select(
      "id, sku, name, description, image_url, price_amount, stock_quantity, low_stock_threshold, is_active, category_id, categories(name)"
    )
    .order("name");

  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError(error);
  }

  const rows = ((data ?? []) as unknown as ProductRow[]).map((row) => ({
    ...row,
    product_ingredients: [],
    product_addon_links: []
  }));

  if (rows.length === 0) {
    return rows.map(mapProduct);
  }

  try {
    const [recipeResult, addonLinkResult] = await Promise.all([
      supabase.from("product_ingredients").select("product_id"),
      supabase.from("product_addon_links").select("product_id")
    ]);

    if (recipeResult.error && !isSupabaseSchemaError(recipeResult.error)) {
      throw recipeResult.error;
    }

    if (addonLinkResult.error && !isSupabaseSchemaError(addonLinkResult.error)) {
      throw addonLinkResult.error;
    }

    const productsWithRecipes = new Set(((recipeResult.data ?? []) as Array<{ product_id: string }>).map((row) => row.product_id));
    const productsWithAddons = new Set(((addonLinkResult.data ?? []) as Array<{ product_id: string }>).map((row) => row.product_id));

    return rows.map((row) =>
      mapProduct({
        ...row,
        product_ingredients: productsWithRecipes.has(row.id) ? [{ id: "linked" }] : [],
        product_addon_links: productsWithAddons.has(row.id) ? [{ id: "linked" }] : []
      })
    );
  } catch (error) {
    if (isSupabaseSchemaError(error as SupabaseMaybeError)) {
      return rows.map(mapProduct);
    }

    throw new Error(formatSupabaseError(error as SupabaseMaybeError));
  }
}

async function categories(options: { activeOnly?: boolean } = {}) {
  let query = supabase.from("categories").select("id, name, slug, sort_order, is_active").order("sort_order").order("name");

  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError(error);
  }

  return (data as CategoryRow[]).map(mapCategory);
}

async function discounts(options: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("discounts")
    .select("id, code, name, scope, value_type, value_amount, description, allowed_roles, is_active, expires_at")
    .order("name");

  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return ((data ?? []) as DiscountRow[]).map(mapDiscount);
}

async function saveCategory(values: CategoryFormValues) {
  const payload = {
    name: values.name.trim(),
    slug: slugify(values.name),
    sort_order: values.sortOrder,
    is_active: values.isActive
  };

  const query = values.id
    ? supabase.from("categories").update(payload).eq("id", values.id).select("id, name, slug, sort_order, is_active").single()
    : supabase.from("categories").insert(payload).select("id, name, slug, sort_order, is_active").single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error);
  }

  return mapCategory(data as CategoryRow);
}

async function toggleCategory(id: string, isActive: boolean) {
  const { error } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throwSupabaseError(error);
  }
}

async function saveProduct(values: ProductFormValues) {
  const payload = {
    name: values.name.trim(),
    sku: values.sku.trim().toUpperCase(),
    category_id: values.categoryId,
    description: values.description.trim(),
    price_amount: values.price,
    stock_quantity: values.stockQuantity,
    low_stock_threshold: values.lowStockThreshold,
    image_url: values.imageUrl?.trim() ? values.imageUrl.trim() : null,
    is_active: values.isActive
  };

  const query = values.id
    ? supabase
        .from("products")
        .update(payload)
        .eq("id", values.id)
        .select(
          "id, sku, name, description, image_url, price_amount, stock_quantity, low_stock_threshold, is_active, category_id, categories(name)"
        )
        .single()
    : supabase
        .from("products")
        .insert(payload)
        .select(
          "id, sku, name, description, image_url, price_amount, stock_quantity, low_stock_threshold, is_active, category_id, categories(name)"
        )
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(formatSupabaseError(error));
  }

  return mapProduct(data as unknown as ProductRow);
}

async function toggleProduct(id: string, isActive: boolean) {
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throwSupabaseError(error);
  }
}

async function saveDiscount(values: DiscountFormValues) {
  const payload = {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    scope: values.scope,
    value_type: values.valueType,
    value_amount: values.valueAmount,
    description: values.description.trim(),
    allowed_roles: values.allowedRoles,
    is_active: values.isActive,
    expires_at: values.expiresAt ? new Date(values.expiresAt).toISOString() : null
  };

  const query = values.id
    ? supabase
        .from("discounts")
        .update(payload)
        .eq("id", values.id)
        .select("id, code, name, scope, value_type, value_amount, description, allowed_roles, is_active, expires_at")
        .single()
    : supabase
        .from("discounts")
        .insert(payload)
        .select("id, code, name, scope, value_type, value_amount, description, allowed_roles, is_active, expires_at")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error);
  }

  return mapDiscount(data as DiscountRow);
}

async function toggleDiscount(id: string, isActive: boolean) {
  const { error } = await supabase.from("discounts").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throwSupabaseError(error);
  }
}

async function businessSettings() {
  const { data, error } = await supabase
    .from("business_settings")
    .select(BUSINESS_SETTINGS_SELECT)
    .eq("settings_key", "default")
    .maybeSingle();

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return mergeCafeSettings();
    }

    throwSupabaseError(error);
  }

  return data ? mapCafeSettingsRow(data as BusinessSettingsRow) : mergeCafeSettings();
}

async function saveBusinessSettings(values: CafeSettings) {
  const payload = mapCafeSettingsToRow(values);
  const { data, error } = await supabase
    .from("business_settings")
    .upsert(payload)
    .select(BUSINESS_SETTINGS_SELECT)
    .single();

  if (error || !data) {
    throwSupabaseError(error, "Business settings could not be saved right now.");
  }

  return mapCafeSettingsRow(data as BusinessSettingsRow);
}

async function createOrder(payload: OrderPayload) {
  const { data, error } = await supabase.rpc("create_order", {
    p_order_type: payload.order_type,
    p_payment_method: payload.payment_method,
    p_customer_email: payload.customer_email ?? null,
    p_notes: payload.notes ?? null,
    p_items: payload.items,
    p_discount_id: payload.discount_id ?? null,
    p_amount_paid: payload.amount_paid ?? null,
    p_payment_reference: payload.payment_reference ?? null,
    p_payment_notes: payload.payment_notes ?? null
  });

  if (error) {
    throwSupabaseError(error);
  }

  const order = Array.isArray(data) ? data[0] : data;

  return {
    id: order.id as string,
    orderNumber: order.order_number as string,
    queueNumber: (order.queue_number as string | null) ?? undefined,
    grandTotal: toNumber(order.grand_total as number | string)
  };
}

const BUSINESS_SETTINGS_SELECT =
  "settings_key, store_name, branch_name, contact_number, email, address, business_info, logo_url, receipt_header, receipt_footer, receipt_notes, show_logo, show_cashier_name, show_order_number, show_queue_number, tax_label, tax_rate, currency, default_order_type, stock_warning, low_stock_threshold, require_payment_reference, auto_print_receipt, senior_discount, pwd_discount, default_discount_percent, promo_codes, manual_discount_roles, compact_mode";

function mapCafeSettingsToRow(values: CafeSettings): BusinessSettingsRow {
  const normalized = normalizeCafeSettingsInput(values);

  return {
    settings_key: "default",
    store_name: normalized.storeName,
    branch_name: normalized.branchName,
    contact_number: normalized.contactNumber,
    email: normalized.email,
    address: normalized.address,
    business_info: normalized.businessInfo,
    logo_url: normalized.logoUrl?.trim() ? normalized.logoUrl.trim() : null,
    receipt_header: normalized.receiptHeader,
    receipt_footer: normalized.receiptFooter,
    receipt_notes: normalized.receiptNotes,
    show_logo: normalized.showLogo,
    show_cashier_name: normalized.showCashierName,
    show_order_number: normalized.showOrderNumber,
    show_queue_number: normalized.showQueueNumber,
    tax_label: normalized.taxLabel,
    tax_rate: normalized.taxRate,
    currency: normalized.currency,
    default_order_type: normalized.defaultOrderType,
    stock_warning: normalized.stockWarning,
    low_stock_threshold: normalized.lowStockThreshold,
    require_payment_reference: normalized.requirePaymentReference,
    auto_print_receipt: normalized.autoPrintReceipt,
    senior_discount: normalized.seniorDiscount,
    pwd_discount: normalized.pwdDiscount,
    default_discount_percent: normalized.defaultDiscountPercent,
    promo_codes: normalized.promoCodes,
    manual_discount_roles: normalized.manualDiscountRoles,
    compact_mode: normalized.compactMode
  };
}

function buildOrderSelect(includeAddons = true) {
  if (!includeAddons) {
    return "id, order_number, queue_number, queue_business_date, order_type, payment_method, customer_email, notes, subtotal, discount_label, discount_code, discount_total, tax_total, grand_total, amount_paid, change_due, payment_reference, payment_notes, receipt_settings_snapshot, created_at, profiles!orders_cashier_id_fkey(full_name), order_items(id, product_id, product_name, quantity, unit_price, line_total)";
  }

  return "id, order_number, queue_number, queue_business_date, order_type, payment_method, customer_email, notes, subtotal, discount_label, discount_code, discount_total, tax_total, grand_total, amount_paid, change_due, payment_reference, payment_notes, receipt_settings_snapshot, created_at, profiles!orders_cashier_id_fkey(full_name), order_items(id, product_id, product_name, quantity, unit_price, line_total, order_item_addons(id, order_item_id, addon_id, addon_name, price_delta, quantity, created_at))";
}

async function listOrders(limit = 24) {
  let { data, error } = await supabase
    .from("orders")
    .select(buildOrderSelect())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error && isSupabaseSchemaError(error)) {
    const fallback = await supabase
      .from("orders")
      .select(buildOrderSelect(false))
      .order("created_at", { ascending: false })
      .limit(limit);

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throwSupabaseError(error);
  }

  return ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
}

async function getOrderById(id: string) {
  let { data, error } = await supabase.from("orders").select(buildOrderSelect()).eq("id", id).single();

  if (error && isSupabaseSchemaError(error)) {
    const fallback = await supabase.from("orders").select(buildOrderSelect(false)).eq("id", id).single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    throwSupabaseError(error);
  }

  return mapOrder(data as unknown as OrderRow);
}

async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .order("created_at");

  if (error) {
    throwSupabaseError(error);
  }

  return (data as ProfileRow[]).map(mapProfile);
}

async function updateProfile(id: string, values: Partial<Pick<AuthUser, "role" | "isActive" | "name">>) {
  const payload: Record<string, unknown> = {};

  if (values.role) {
    payload.role = values.role;
  }

  if (typeof values.isActive === "boolean") {
    payload.is_active = values.isActive;
  }

  if (values.name) {
    payload.full_name = values.name.trim();
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id, email, full_name, role, is_active")
    .single();

  if (error || !data) {
    throw new Error(formatSupabaseError(error));
  }

  return mapProfile(data as ProfileRow);
}

async function adjustInventory(payload: {
  productId: string;
  quantityDelta: number;
  reason?: string;
  adjustmentType?: InventoryAdjustmentRecord["adjustmentType"];
}) {
  const { data, error } = await supabase.rpc("adjust_inventory", {
    p_product_id: payload.productId,
    p_quantity_delta: payload.quantityDelta,
    p_reason: payload.reason ?? null,
    p_adjustment_type: payload.adjustmentType ?? "manual"
  });

  if (error) {
    throwSupabaseError(error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    productId: result.product_id as string,
    stockQuantity: Number(result.stock_quantity)
  };
}

async function inventoryAdjustments(limit = 50) {
  const { data, error } = await supabase
    .from("inventory_adjustments")
    .select(
      "id, product_id, user_id, adjustment_type, quantity_delta, previous_quantity, new_quantity, reason, reference_order_id, created_at, products(name), profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return ((data ?? []) as unknown as InventoryAdjustmentRow[]).map(mapInventoryAdjustment);
}

async function ingredients(options: { activeOnly?: boolean } = {}) {
  let query = supabase
    .from("ingredients")
    .select(
      "id, sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, is_active, created_at, updated_at"
    )
    .order("name");

  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return ((data ?? []) as unknown as IngredientRow[]).map(mapIngredient);
}

async function saveIngredient(values: IngredientFormValues) {
  const payload = {
    sku: values.sku.trim().toUpperCase(),
    name: values.name.trim(),
    category: values.category.trim(),
    unit: values.unit.trim(),
    quantity_on_hand: values.quantityOnHand,
    low_stock_threshold: values.lowStockThreshold,
    cost_per_unit: values.costPerUnit,
    supplier: values.supplier.trim() || null,
    is_active: values.isActive
  };

  const query = values.id
    ? supabase
        .from("ingredients")
        .update(payload)
        .eq("id", values.id)
        .select(
          "id, sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, is_active, created_at, updated_at"
        )
        .single()
    : supabase
        .from("ingredients")
        .insert(payload)
        .select(
          "id, sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, is_active, created_at, updated_at"
        )
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  return mapIngredient(data as unknown as IngredientRow);
}

async function toggleIngredient(id: string, isActive: boolean) {
  const { error } = await supabase.from("ingredients").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throwSupabaseError(error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }
}

async function productIngredients(productId: string) {
  const { data, error } = await supabase
    .from("product_ingredients")
    .select("id, product_id, ingredient_id, quantity_required, created_at")
    .eq("product_id", productId)
    .order("created_at");

  if (error) {
    throwSupabaseError(error, "Product recipe tables are not available yet. Apply the latest Supabase migration.");
  }

  const rows = (data ?? []) as ProductIngredientRow[];
  const ingredientIds = [...new Set(rows.map((row) => row.ingredient_id))];
  const { data: ingredientData, error: ingredientError } =
    ingredientIds.length > 0
      ? await supabase.from("ingredients").select("id, name, unit, cost_per_unit").in("id", ingredientIds)
      : { data: [], error: null };

  if (ingredientError) {
    throwSupabaseError(ingredientError, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  const ingredientMap = new Map(
    ((ingredientData ?? []) as Array<{ id: string; name: string; unit: string; cost_per_unit: number | string }>).map((row) => [row.id, row])
  );

  return rows.map((row) =>
    mapProductIngredient({
      ...row,
      ingredients: ingredientMap.get(row.ingredient_id) ?? null
    })
  );
}

async function saveProductIngredient(values: ProductIngredientFormValues) {
  const payload = {
    product_id: values.productId,
    ingredient_id: values.ingredientId,
    quantity_required: values.quantityRequired
  };

  const query = values.id
    ? supabase
        .from("product_ingredients")
        .update(payload)
        .eq("id", values.id)
        .select("id, product_id, ingredient_id, quantity_required, created_at")
        .single()
    : supabase
        .from("product_ingredients")
        .insert(payload)
        .select("id, product_id, ingredient_id, quantity_required, created_at")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error, "Product recipe tables are not available yet. Apply the latest Supabase migration.");
  }

  return mapProductIngredient(data as unknown as ProductIngredientRow);
}

async function deleteProductIngredient(id: string) {
  const { error } = await supabase.from("product_ingredients").delete().eq("id", id);

  if (error) {
    throwSupabaseError(error, "Product recipe tables are not available yet. Apply the latest Supabase migration.");
  }
}

async function adjustIngredient(payload: {
  ingredientId: string;
  quantityDelta: number;
  reason?: string;
  adjustmentType?: IngredientAdjustmentType;
}) {
  const { data, error } = await supabase.rpc("adjust_ingredient", {
    p_ingredient_id: payload.ingredientId,
    p_quantity_delta: payload.quantityDelta,
    p_reason: payload.reason ?? null,
    p_adjustment_type: payload.adjustmentType ?? "manual"
  });

  if (error) {
    throwSupabaseError(error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    ingredientId: result.ingredient_id as string,
    quantityOnHand: toNumber(result.quantity_on_hand as number | string)
  };
}

async function ingredientAdjustments(limit = 50) {
  const { data, error } = await supabase
    .from("ingredient_adjustments")
    .select(
      "id, ingredient_id, user_id, adjustment_type, quantity_delta, previous_quantity, new_quantity, reason, reference_order_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throwSupabaseError(error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  const rows = (data ?? []) as IngredientAdjustmentRow[];
  const ingredientIds = [...new Set(rows.map((row) => row.ingredient_id))];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const [ingredientResult, profileResult] = await Promise.all([
    ingredientIds.length > 0 ? supabase.from("ingredients").select("id, name, unit").in("id", ingredientIds) : Promise.resolve({ data: [], error: null }),
    userIds.length > 0 ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [], error: null })
  ]);

  if (ingredientResult.error) {
    throwSupabaseError(ingredientResult.error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  if (profileResult.error) {
    throwSupabaseError(profileResult.error);
  }

  const ingredientMap = new Map(((ingredientResult.data ?? []) as Array<{ id: string; name: string; unit: string }>).map((row) => [row.id, row]));
  const profileMap = new Map(((profileResult.data ?? []) as Array<{ id: string; full_name: string }>).map((row) => [row.id, row]));

  return rows.map((row) =>
    mapIngredientAdjustment({
      ...row,
      ingredients: ingredientMap.get(row.ingredient_id) ?? null,
      profiles: profileMap.get(row.user_id) ?? null
    })
  );
}

async function productAddons(productId?: string) {
  if (productId) {
    const { data: linkData, error: linkError } = await supabase
      .from("product_addon_links")
      .select("addon_id")
      .eq("product_id", productId);

    if (linkError) {
      throwSupabaseError(linkError, "Product add-on tables are not available yet. Apply the latest Supabase migration.");
    }

    const addonIds = ((linkData ?? []) as Array<{ addon_id: string }>).map((row) => row.addon_id);

    if (addonIds.length === 0) {
      return [];
    }

    const { data: addonData, error: addonError } = await supabase
      .from("product_addons")
      .select("id, name, sku, description, price_delta, is_active, created_at, updated_at")
      .in("id", addonIds)
      .eq("is_active", true)
      .order("name");

    if (addonError) {
      throwSupabaseError(addonError, "Product add-on tables are not available yet. Apply the latest Supabase migration.");
    }

    return ((addonData ?? []) as unknown as ProductAddonRow[]).map(mapProductAddon);
  }

  const { data, error } = await supabase
    .from("product_addons")
    .select("id, name, sku, description, price_delta, is_active, created_at, updated_at")
    .order("name");

  if (error) {
    throwSupabaseError(error, "Product add-on tables are not available yet. Apply the latest Supabase migration.");
  }

  return ((data ?? []) as unknown as ProductAddonRow[]).map(mapProductAddon);
}

async function saveAddon(values: ProductAddonFormValues) {
  const payload = {
    name: values.name.trim(),
    sku: values.sku.trim().toUpperCase(),
    description: values.description.trim() || null,
    price_delta: values.priceDelta,
    is_active: values.isActive
  };

  const query = values.id
    ? supabase
        .from("product_addons")
        .update(payload)
        .eq("id", values.id)
        .select("id, name, sku, description, price_delta, is_active, created_at, updated_at")
        .single()
    : supabase
        .from("product_addons")
        .insert(payload)
        .select("id, name, sku, description, price_delta, is_active, created_at, updated_at")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error, "Product add-on tables are not available yet. Apply the latest Supabase migration.");
  }

  return mapProductAddon(data as unknown as ProductAddonRow);
}

async function toggleAddon(id: string, isActive: boolean) {
  const { error } = await supabase.from("product_addons").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throwSupabaseError(error, "Product add-on tables are not available yet. Apply the latest Supabase migration.");
  }
}

async function addonIngredients(addonId: string) {
  const { data, error } = await supabase
    .from("product_addon_ingredients")
    .select("id, addon_id, ingredient_id, quantity_required, created_at")
    .eq("addon_id", addonId)
    .order("created_at");

  if (error) {
    throwSupabaseError(error, "Product add-on ingredient tables are not available yet. Apply the latest Supabase migration.");
  }

  const rows = (data ?? []) as ProductAddonIngredientRow[];
  const ingredientIds = [...new Set(rows.map((row) => row.ingredient_id))];
  const { data: ingredientData, error: ingredientError } =
    ingredientIds.length > 0
      ? await supabase.from("ingredients").select("id, name, unit, cost_per_unit").in("id", ingredientIds)
      : { data: [], error: null };

  if (ingredientError) {
    throwSupabaseError(ingredientError, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  const ingredientMap = new Map(
    ((ingredientData ?? []) as Array<{ id: string; name: string; unit: string; cost_per_unit: number | string }>).map((row) => [row.id, row])
  );

  return rows.map((row) =>
    mapAddonIngredient({
      ...row,
      ingredients: ingredientMap.get(row.ingredient_id) ?? null
    })
  );
}

async function saveAddonIngredient(values: ProductAddonIngredientFormValues) {
  const payload = {
    addon_id: values.addonId,
    ingredient_id: values.ingredientId,
    quantity_required: values.quantityRequired
  };

  const query = values.id
    ? supabase
        .from("product_addon_ingredients")
        .update(payload)
        .eq("id", values.id)
        .select("id, addon_id, ingredient_id, quantity_required, created_at")
        .single()
    : supabase
        .from("product_addon_ingredients")
        .insert(payload)
        .select("id, addon_id, ingredient_id, quantity_required, created_at")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error, "Product add-on ingredient tables are not available yet. Apply the latest Supabase migration.");
  }

  return mapAddonIngredient(data as unknown as ProductAddonIngredientRow);
}

async function deleteAddonIngredient(id: string) {
  const { error } = await supabase.from("product_addon_ingredients").delete().eq("id", id);

  if (error) {
    throwSupabaseError(error, "Product add-on ingredient tables are not available yet. Apply the latest Supabase migration.");
  }
}

async function productAddonLinks(productId?: string) {
  let query = supabase
    .from("product_addon_links")
    .select("id, product_id, addon_id, created_at")
    .order("created_at");

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;

  if (error) {
    throwSupabaseError(error, "Product add-on link tables are not available yet. Apply the latest Supabase migration.");
  }

  const rows = (data ?? []) as ProductAddonLinkRow[];
  const productIds = [...new Set(rows.map((row) => row.product_id))];
  const addonIds = [...new Set(rows.map((row) => row.addon_id))];

  const [productsResult, addonsResult] = await Promise.all([
    productIds.length > 0 ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [], error: null }),
    addonIds.length > 0 ? supabase.from("product_addons").select("id, name").in("id", addonIds) : Promise.resolve({ data: [], error: null })
  ]);

  if (productsResult.error && !isSupabaseSchemaError(productsResult.error)) {
    throw new Error(formatSupabaseError(productsResult.error));
  }

  if (addonsResult.error) {
    throwSupabaseError(addonsResult.error, "Product add-on tables are not available yet. Apply the latest Supabase migration.");
  }

  const productNames = new Map(((productsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
  const addonNames = new Map(((addonsResult.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: productNames.get(row.product_id) ?? "Unknown product",
    addonId: row.addon_id,
    addonName: addonNames.get(row.addon_id) ?? "Unknown add-on",
    createdAt: row.created_at
  }));
}

async function saveProductAddonLink(values: ProductAddonLinkFormValues) {
  const payload = {
    product_id: values.productId,
    addon_id: values.addonId
  };

  const query = values.id
    ? supabase
        .from("product_addon_links")
        .update(payload)
        .eq("id", values.id)
        .select("id, product_id, addon_id, created_at")
        .single()
    : supabase
        .from("product_addon_links")
        .insert(payload)
        .select("id, product_id, addon_id, created_at")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    throwSupabaseError(error, "Product add-on link tables are not available yet. Apply the latest Supabase migration.");
  }

  return {
    id: (data as ProductAddonLinkRow).id,
    productId: (data as ProductAddonLinkRow).product_id,
    productName: "Product",
    addonId: (data as ProductAddonLinkRow).addon_id,
    addonName: "Add-on",
    createdAt: (data as ProductAddonLinkRow).created_at
  };
}

async function deleteProductAddonLink(id: string) {
  const { error } = await supabase.from("product_addon_links").delete().eq("id", id);

  if (error) {
    throwSupabaseError(error, "Product add-on link tables are not available yet. Apply the latest Supabase migration.");
  }
}

async function createUser(payload: { fullName: string; email: string; role: AuthUser["role"]; temporaryPassword: string }) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("create-user", {
    body: payload,
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
  });

  if (error) {
    throw new Error(error.message || "Unable to create user.");
  }

  if (!data?.user) {
    throw new Error("Unable to create user.");
  }

  return data.user as AuthUser;
}

async function getFunctionErrorMessage(error: unknown, fallbackMessage: string) {
  const response = (error as { context?: Response } | undefined)?.context;

  if (response instanceof Response) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (body?.error) {
      return body.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function sendReceiptEmail(payload: { orderId: string; recipientEmail?: string }) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("send-receipt-email", {
    body: payload,
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, "Unable to send receipt email."));
  }

  if (!data?.success) {
    throw new Error((data?.error as string | undefined) ?? "Unable to send receipt email.");
  }

  return data as { success: boolean; recipientEmail: string; message: string };
}

async function dashboardSummary(): Promise<DashboardSummary> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeProducts, activeIngredients, ordersToday, recentOrders] = await Promise.all([
    products({ activeOnly: true }),
    ingredients({ activeOnly: true }).catch((error) => {
      if (isSetupRequiredError(error)) {
        return [];
      }

      throw error;
    }),
    supabase
      .from("orders")
      .select("id, grand_total", { count: "exact" })
      .gte("created_at", startOfDay.toISOString()),
    listOrders(5)
  ]);

  if (ordersToday.error) {
    throw new Error(formatSupabaseError(ordersToday.error));
  }

  const lowStockItems = activeProducts.filter((product) => product.stockQuantity <= product.lowStockThreshold);
  const lowStockIngredients = activeIngredients.filter((ingredient) => ingredient.quantityOnHand <= ingredient.lowStockThreshold);
  const revenueToday = ordersToday.data?.reduce((sum, order) => sum + toNumber(order.grand_total as number | string), 0) ?? 0;

  return {
    revenueToday,
    ordersToday: ordersToday.count ?? 0,
    activeProducts: activeProducts.length,
    lowStockItems,
    lowStockIngredients,
    recentOrders
  };
}

async function salesSummary(range?: { from?: string; to?: string }): Promise<SalesSummary> {
  let ordersQuery = supabase.from("orders").select(buildOrderSelect()).order("created_at", { ascending: false }).limit(100);

  if (range?.from) {
    ordersQuery = ordersQuery.gte("created_at", new Date(range.from).toISOString());
  }

  if (range?.to) {
    ordersQuery = ordersQuery.lte("created_at", new Date(range.to).toISOString());
  }

  let { data, error } = await ordersQuery;

  if (error && isSupabaseSchemaError(error)) {
    let fallbackQuery = supabase.from("orders").select(buildOrderSelect(false)).order("created_at", { ascending: false }).limit(100);

    if (range?.from) {
      fallbackQuery = fallbackQuery.gte("created_at", new Date(range.from).toISOString());
    }

    if (range?.to) {
      fallbackQuery = fallbackQuery.lte("created_at", new Date(range.to).toISOString());
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throwSupabaseError(error);
  }

  const productCategoryResult = await supabase.from("products").select("id, categories(name)");

  if (productCategoryResult.error && !isSupabaseSchemaError(productCategoryResult.error)) {
    throw new Error(formatSupabaseError(productCategoryResult.error));
  }

  const productCategoryMap = new Map<string, string>();

  for (const row of productCategoryResult.data ?? []) {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    productCategoryMap.set(row.id as string, (category?.name as string | undefined) ?? "Uncategorized");
  }

  const orders = ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
  const ordersCount = orders.length;
  const revenueTotal = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const topItemsMap = new Map<string, { productName: string; quantity: number; revenue: number }>();
  const paymentBreakdownMap = new Map<SalesSummary["paymentBreakdown"][number]["method"], SalesSummary["paymentBreakdown"][number]>();
  const categoryBreakdownMap = new Map<string, SalesSummary["categoryBreakdown"][number]>();
  const salesByDayMap = new Map<string, SalesSummary["salesByDay"][number]>();

  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    const dayKey = orderDate.toISOString().slice(0, 10);
    const daySummary = salesByDayMap.get(dayKey);

    if (daySummary) {
      daySummary.revenue += order.grandTotal;
      daySummary.orders += 1;
    } else {
      salesByDayMap.set(dayKey, {
        date: dayKey,
        label: orderDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
        revenue: order.grandTotal,
        orders: 1
      });
    }

    const paymentSummary = paymentBreakdownMap.get(order.paymentMethod);

    if (paymentSummary) {
      paymentSummary.orders += 1;
      paymentSummary.revenue += order.grandTotal;
    } else {
      paymentBreakdownMap.set(order.paymentMethod, {
        method: order.paymentMethod,
        orders: 1,
        revenue: order.grandTotal
      });
    }

    for (const item of order.items) {
      const existing = topItemsMap.get(item.productName);
      const categoryName = productCategoryMap.get(item.productId) ?? item.category ?? "Uncategorized";
      const categorySummary = categoryBreakdownMap.get(categoryName);

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
      } else {
        topItemsMap.set(item.productName, {
          productName: item.productName,
          quantity: item.quantity,
          revenue: item.lineTotal
        });
      }

      if (categorySummary) {
        categorySummary.quantity += item.quantity;
        categorySummary.revenue += item.lineTotal;
      } else {
        categoryBreakdownMap.set(categoryName, {
          category: categoryName,
          quantity: item.quantity,
          revenue: item.lineTotal
        });
      }
    }
  }

  return {
    revenueTotal,
    ordersCount,
    averageOrderValue: ordersCount === 0 ? 0 : Number((revenueTotal / ordersCount).toFixed(2)),
    topItems: [...topItemsMap.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5),
    salesByDay: [...salesByDayMap.values()].sort((left, right) => left.date.localeCompare(right.date)),
    paymentBreakdown: [...paymentBreakdownMap.values()].sort((left, right) => right.revenue - left.revenue),
    categoryBreakdown: [...categoryBreakdownMap.values()].sort((left, right) => right.revenue - left.revenue),
    orders,
    recentOrders: orders.slice(0, 8)
  };
}

export const apiClient = {
  adjustIngredient,
  adjustInventory,
  addonIngredients,
  categories,
  createOrder,
  createUser,
  dashboardSummary,
  businessSettings,
  deleteAddonIngredient,
  deleteProductAddonLink,
  deleteProductIngredient,
  discounts,
  getOrderById,
  getProfileForSession,
  getSessionProfile,
  ingredientAdjustments,
  ingredients,
  inventoryAdjustments,
  listOrders,
  listProfiles,
  login,
  logout,
  productAddonLinks,
  productAddons,
  productIngredients,
  products,
  salesSummary,
  saveAddon,
  saveAddonIngredient,
  saveBusinessSettings,
  saveCategory,
  saveDiscount,
  saveIngredient,
  saveProduct,
  saveProductAddonLink,
  saveProductIngredient,
  sendReceiptEmail,
  toggleAddon,
  toggleCategory,
  toggleDiscount,
  toggleIngredient,
  toggleProduct,
  updateProfile
};
