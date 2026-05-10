import type { Session } from "@supabase/supabase-js";
import type {
  AuthUser,
  CategoryFormValues,
  CategoryRecord,
  DashboardSummary,
  DiscountFormValues,
  DiscountRecord,
  InventoryAdjustmentRecord,
  MenuProduct,
  OrderListItem,
  OrderPayload,
  ProductFormValues,
  SalesSummary
} from "@cafe/shared-types";
import { supabase } from "@/lib/supabase";

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
  order_type: OrderPayload["order_type"];
  payment_method: OrderPayload["payment_method"];
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
  created_at: string;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number | string;
    line_total: number | string;
  }>;
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
    isActive: row.is_active
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

function mapOrder(row: OrderRow): OrderListItem {
  const cashierProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type,
    paymentMethod: row.payment_method,
    cashierName: cashierProfile?.full_name ?? "Unknown cashier",
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
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: toNumber(item.unit_price),
        lineTotal: toNumber(item.line_total)
      })) ?? []
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
    throw new Error(formatSupabaseError(error));
  }

  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
}

async function categories(options: { activeOnly?: boolean } = {}) {
  let query = supabase.from("categories").select("id, name, slug, sort_order, is_active").order("sort_order").order("name");

  if (options.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(formatSupabaseError(error));
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
    throw new Error(formatSupabaseError(error));
  }

  return mapCategory(data as CategoryRow);
}

async function toggleCategory(id: string, isActive: boolean) {
  const { error } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throw new Error(formatSupabaseError(error));
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
    throw new Error(formatSupabaseError(error));
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
    throw new Error(formatSupabaseError(error));
  }

  return mapDiscount(data as DiscountRow);
}

async function toggleDiscount(id: string, isActive: boolean) {
  const { error } = await supabase.from("discounts").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

async function createOrder(payload: OrderPayload) {
  const { data, error } = await supabase.rpc("create_order", {
    p_order_type: payload.order_type,
    p_payment_method: payload.payment_method,
    p_notes: payload.notes ?? null,
    p_items: payload.items,
    p_discount_id: payload.discount_id ?? null,
    p_amount_paid: payload.amount_paid ?? null,
    p_payment_reference: payload.payment_reference ?? null,
    p_payment_notes: payload.payment_notes ?? null
  });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const order = Array.isArray(data) ? data[0] : data;

  return {
    id: order.id as string,
    orderNumber: order.order_number as string,
    grandTotal: toNumber(order.grand_total as number | string)
  };
}

function buildOrderSelect() {
  return "id, order_number, order_type, payment_method, notes, subtotal, discount_label, discount_code, discount_total, tax_total, grand_total, amount_paid, change_due, payment_reference, payment_notes, created_at, profiles!orders_cashier_id_fkey(full_name), order_items(id, product_name, quantity, unit_price, line_total)";
}

async function listOrders(limit = 24) {
  const { data, error } = await supabase
    .from("orders")
    .select(buildOrderSelect())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
}

async function getOrderById(id: string) {
  const { data, error } = await supabase.from("orders").select(buildOrderSelect()).eq("id", id).single();

  if (error || !data) {
    throw new Error(formatSupabaseError(error));
  }

  return mapOrder(data as unknown as OrderRow);
}

async function listProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .order("created_at");

  if (error) {
    throw new Error(formatSupabaseError(error));
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
    throw new Error(formatSupabaseError(error));
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

async function dashboardSummary(): Promise<DashboardSummary> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [activeProducts, ordersToday, recentOrders] = await Promise.all([
    products({ activeOnly: true }),
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
  const revenueToday = ordersToday.data?.reduce((sum, order) => sum + toNumber(order.grand_total as number | string), 0) ?? 0;

  return {
    revenueToday,
    ordersToday: ordersToday.count ?? 0,
    activeProducts: activeProducts.length,
    lowStockItems,
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

  const { data, error } = await ordersQuery;

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const orders = ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
  const ordersCount = orders.length;
  const revenueTotal = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const topItemsMap = new Map<string, { productName: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const existing = topItemsMap.get(item.productName);

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
    }
  }

  return {
    revenueTotal,
    ordersCount,
    averageOrderValue: ordersCount === 0 ? 0 : Number((revenueTotal / ordersCount).toFixed(2)),
    topItems: [...topItemsMap.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5),
    recentOrders: orders.slice(0, 8)
  };
}

export const apiClient = {
  adjustInventory,
  categories,
  createOrder,
  dashboardSummary,
  discounts,
  getOrderById,
  getProfileForSession,
  getSessionProfile,
  inventoryAdjustments,
  listOrders,
  listProfiles,
  login,
  logout,
  products,
  salesSummary,
  saveCategory,
  saveDiscount,
  saveProduct,
  toggleCategory,
  toggleDiscount,
  toggleProduct,
  updateProfile
};
