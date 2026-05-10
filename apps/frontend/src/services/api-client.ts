import type { Session } from "@supabase/supabase-js";
import type {
  AuthUser,
  CategoryFormValues,
  CategoryRecord,
  DashboardSummary,
  MenuProduct,
  OrderListItem,
  OrderPayload,
  ProductFormValues
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
  is_active: boolean;
  category_id: string;
  categories?: { name: string } | Array<{ name: string }> | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  order_type: OrderPayload["order_type"];
  payment_method: OrderPayload["payment_method"];
  notes: string | null;
  subtotal: number | string;
  tax_total: number | string;
  grand_total: number | string;
  created_at: string;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    unit_price: number | string;
    line_total: number | string;
    products?: { name: string | null } | Array<{ name: string | null }> | null;
  }>;
};

function formatSupabaseError(error: { message?: string } | null) {
  return error?.message ?? "Something went wrong while talking to Supabase.";
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
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
    tags: [],
    isActive: row.is_active
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
    taxTotal: toNumber(row.tax_total),
    grandTotal: toNumber(row.grand_total),
    createdAt: row.created_at,
    items:
      row.order_items?.map((item) => ({
        id: item.id,
        productName: (Array.isArray(item.products) ? item.products[0] : item.products)?.name ?? "Unknown product",
        quantity: item.quantity,
        unitPrice: toNumber(item.unit_price),
        lineTotal: toNumber(item.line_total)
      })) ?? []
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
    .select("id, sku, name, description, image_url, price_amount, stock_quantity, is_active, category_id, categories(name)")
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
    image_url: values.imageUrl?.trim() ? values.imageUrl.trim() : null,
    is_active: values.isActive
  };

  const query = values.id
    ? supabase
        .from("products")
        .update(payload)
        .eq("id", values.id)
        .select("id, sku, name, description, image_url, price_amount, stock_quantity, is_active, category_id, categories(name)")
        .single()
    : supabase
        .from("products")
        .insert(payload)
        .select("id, sku, name, description, image_url, price_amount, stock_quantity, is_active, category_id, categories(name)")
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

async function createOrder(payload: OrderPayload) {
  const { data, error } = await supabase.rpc("create_order", {
    p_order_type: payload.order_type,
    p_payment_method: payload.payment_method,
    p_notes: payload.notes ?? null,
    p_items: payload.items
  });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  const order = Array.isArray(data) ? data[0] : data;

  return {
    id: order.id as string,
    order_number: order.order_number as string,
    grand_total: toNumber(order.grand_total as number | string)
  };
}

async function listOrders(limit = 24) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_type, payment_method, notes, subtotal, tax_total, grand_total, created_at, profiles!orders_cashier_id_fkey(full_name), order_items(id, quantity, unit_price, line_total, products(name))"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return ((data ?? []) as unknown as OrderRow[]).map(mapOrder);
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

async function dashboardSummary(): Promise<DashboardSummary> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    activeProductsResult,
    ordersTodayResult,
    lowStockResult,
    recentOrders
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("orders")
      .select("id, grand_total", { count: "exact" })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("products")
      .select("id, sku, name, description, image_url, price_amount, stock_quantity, is_active, category_id, categories(name)")
      .eq("is_active", true)
      .lte("stock_quantity", 20)
      .order("stock_quantity")
      .limit(4),
    listOrders(5)
  ]);

  if (activeProductsResult.error) {
    throw new Error(formatSupabaseError(activeProductsResult.error));
  }

  if (ordersTodayResult.error) {
    throw new Error(formatSupabaseError(ordersTodayResult.error));
  }

  if (lowStockResult.error) {
    throw new Error(formatSupabaseError(lowStockResult.error));
  }

  const revenueToday =
    ordersTodayResult.data?.reduce((sum, order) => sum + toNumber(order.grand_total as number | string), 0) ?? 0;

  return {
    revenueToday,
    ordersToday: ordersTodayResult.count ?? 0,
    activeProducts: activeProductsResult.count ?? 0,
    lowStockItems: ((lowStockResult.data ?? []) as unknown as ProductRow[]).map(mapProduct),
    recentOrders
  };
}

export const apiClient = {
  createOrder,
  categories,
  dashboardSummary,
  getProfileForSession,
  getSessionProfile,
  listOrders,
  listProfiles,
  login,
  logout,
  products,
  saveCategory,
  saveProduct,
  toggleCategory,
  toggleProduct,
  updateProfile
};
