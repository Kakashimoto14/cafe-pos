import type {
  AuthUser,
  CafeSettings,
  DashboardSummary,
  DiscountRecord,
  DiscountScope,
  DiscountValueType,
  IngredientRecord,
  MenuProduct,
  OrderChannel,
  OrderItemAddonRecord,
  OrderListItem,
  PaginatedResponse,
  PaymentProvider,
  SalesSummary
} from "@cafe/shared-types";
import { mergeCafeSettings } from "@/lib/cafe-settings";
import { SupabaseSchemaSetupError } from "@/services/api-client";
import { supabase } from "@/lib/supabase";

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

type DiscountRow = {
  id: string;
  code: string;
  name: string;
  scope: DiscountScope;
  value_type: DiscountValueType;
  value_amount: number | string;
  description: string;
  allowed_roles: AuthUser["role"][];
  is_active: boolean;
  expires_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: AuthUser["role"];
  is_active: boolean;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
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

type OrderRow = {
  id: string;
  order_number: string;
  queue_number: string | null;
  queue_sequence?: number | null;
  queue_business_date: string | null;
  cashier_id: string;
  order_type: OrderChannel;
  payment_method: PaymentProvider;
  customer_email: string | null;
  notes: string | null;
  subtotal: number | string;
  discount_total: number | string;
  tax_total: number | string;
  grand_total: number | string;
  amount_paid: number | string;
  change_due: number | string;
  payment_reference: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at?: string;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  order_items?: Array<{
    id: string;
    order_id?: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number | string;
    line_total: number | string;
    created_at?: string;
    order_item_addons?: Array<OrderItemAddonRow>;
  }>;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  created_at?: string;
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

type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

type RecentOrderRow = Pick<OrderRow, "id" | "order_number" | "cashier_id" | "payment_method" | "grand_total" | "created_at">;

const BUSINESS_SETTINGS_SELECT =
  "settings_key, store_name, branch_name, contact_number, email, address, business_info, logo_url, receipt_header, receipt_footer, receipt_notes, show_logo, show_cashier_name, show_order_number, show_queue_number, tax_label, tax_rate, currency, default_order_type, stock_warning, low_stock_threshold, require_payment_reference, auto_print_receipt, senior_discount, pwd_discount, default_discount_percent, promo_codes, manual_discount_roles, compact_mode";

const ORDER_LIST_SELECT =
  "id, order_number, cashier_id, order_type, payment_method, notes, subtotal, discount_total, tax_total, grand_total, created_at, updated_at, payment_reference, amount_paid, change_due, payment_notes, queue_number, queue_sequence, queue_business_date, customer_email";

const ORDER_SUMMARY_SELECT = "id, order_number, payment_method, grand_total, created_at";
const ORDER_RECENT_SELECT = "id, order_number, cashier_id, payment_method, grand_total, created_at";

const ORDER_ITEM_SELECT = "id, order_id, product_id, quantity, unit_price, line_total, created_at, product_name";
const PAYMENT_METHOD_SEARCH_VALUES: PaymentProvider[] = ["cash", "card", "gcash", "maya", "qr", "instapay", "other"];

function formatSupabaseError(error: { message?: string } | null) {
  return error?.message ?? "Something went wrong while talking to Supabase.";
}

function logSupabaseError(context: string, error: unknown) {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
}

function isSupabaseNetworkError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return text.includes("failed to fetch") || text.includes("network") || text.includes("load failed");
}

function isAbortLikeError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return text.includes("aborterror") || text.includes("aborted") || text.includes("signal is aborted");
}

function isSupabaseSchemaError(error: { code?: string; message?: string; details?: string; hint?: string; status?: number } | null | undefined) {
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

function throwSupabaseError(error: { code?: string; message?: string; details?: string; hint?: string; status?: number } | null, setupMessage?: string): never {
  if (isSupabaseSchemaError(error)) {
    throw new SupabaseSchemaSetupError(setupMessage);
  }

  throw new Error(formatSupabaseError(error));
}

function throwOrderQueryError(
  error: { code?: string; message?: string; details?: string; hint?: string; status?: number } | null,
  context: "orders" | "sales"
): never {
  logSupabaseError(`${context}-query`, error);

  if ((error?.code ?? "").toLowerCase() === "57014") {
    throw new Error(
      context === "sales"
        ? "Sales transactions are taking too long to load. The query needs optimization."
        : "Orders are taking too long to load. The query needs optimization."
    );
  }

  if (isSupabaseSchemaError(error)) {
    throw new SupabaseSchemaSetupError(
      context === "sales"
        ? "Sales transaction table was not found. Check database migration or table name."
        : "Orders table was not found. Check database migration or table name."
    );
  }

  if (isAbortLikeError(error)) {
    throw new Error(
      context === "sales"
        ? "Sales transactions are taking too long to load. The query needs optimization."
        : "Orders are taking too long to load. The query needs optimization."
    );
  }

  if (isSupabaseNetworkError(error)) {
    throw new Error(
      context === "sales"
        ? "Unable to load sales transactions. Please check the database query or permissions."
        : "Unable to load orders. Please check the database query or permissions."
    );
  }

  throw new Error(
    context === "sales"
      ? "Unable to load sales transactions. Please check the database query or permissions."
      : "Unable to load orders. Please check the database query or permissions."
  );
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

function normalizeSearchTerm(value?: string) {
  return (value ?? "").trim().replace(/[,%()]/g, " ");
}

function getRange(page = 1, limit = 20) {
  const safePage = Math.max(page, 1);
  const safeLimit = Math.max(limit, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  return { page: safePage, limit: safeLimit, from, to };
}

function buildListMeta(page: number, limit: number, visibleCount: number, hasMore: boolean): PaginatedResponse<never>["meta"] {
  if (visibleCount === 0 && page === 1) {
    return {
      page: 1,
      limit,
      total: 0,
      totalPages: 0
    };
  }

  return {
    page: Math.max(page, 1),
    limit,
    total: hasMore ? page * limit + 1 : (page - 1) * limit + visibleCount,
    totalPages: hasMore ? page + 1 : Math.max(page, 1)
  };
}

function mapProduct(row: ProductRow, linked?: { hasRecipe: boolean; hasAddons: boolean }): MenuProduct {
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
    hasRecipe: linked?.hasRecipe ?? false,
    hasAddons: linked?.hasAddons ?? false
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

function mapProfile(row: ProfileRow): AuthUser {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active
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

function mapOrder(row: OrderRow): OrderListItem {
  const cashierProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const cashierName = cashierProfile?.full_name?.trim() || row.cashier_id || "Unknown cashier";

  return {
    id: row.id,
    orderNumber: row.order_number,
    queueNumber: row.queue_number ?? undefined,
    queueDate: row.queue_business_date ?? undefined,
    orderType: row.order_type,
    paymentMethod: row.payment_method,
    cashierName,
    customerEmail: row.customer_email ?? undefined,
    notes: row.notes ?? undefined,
    subtotal: toNumber(row.subtotal),
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
        productName: item.product_name?.trim() || "Unknown item",
        quantity: item.quantity,
        unitPrice: toNumber(item.unit_price),
        lineTotal: toNumber(item.line_total),
        addons: item.order_item_addons?.map(mapOrderItemAddon) ?? []
      })) ?? []
  };
}
function buildOrderSearchFilter(search: string) {
  const filters = [
    `order_number.ilike.%${search}%`,
    `queue_number.ilike.%${search}%`,
    `payment_reference.ilike.%${search}%`,
    `customer_email.ilike.%${search}%`,
    `notes.ilike.%${search}%`
  ];

  const normalized = search.toLowerCase();
  if (PAYMENT_METHOD_SEARCH_VALUES.includes(normalized as PaymentProvider)) {
    filters.push(`payment_method.eq.${normalized}`);
  }

  return filters.join(",");
}

async function hydrateOrders(orderRows: OrderRow[], context: "orders" | "sales") {
  if (orderRows.length === 0) {
    return [];
  }

  const cashierIds = [...new Set(orderRows.map((row) => row.cashier_id))];
  const orderIds = orderRows.map((row) => row.id);

  const [profilesResult, orderItemsResult] = await Promise.all([
    cashierIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", cashierIds)
      : Promise.resolve({ data: [] as ProfileNameRow[], error: null }),
    orderIds.length > 0
      ? supabase.from("order_items").select(ORDER_ITEM_SELECT).in("order_id", orderIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as OrderItemRow[], error: null })
  ]);

  if (profilesResult.error) {
    logSupabaseError(`${context}-profiles`, profilesResult.error);
  }

  if (orderItemsResult.error) {
    throwOrderQueryError(orderItemsResult.error, context);
  }

  const orderItems = (orderItemsResult.data ?? []) as OrderItemRow[];
  const cashierProfiles = new Map(((profilesResult.data ?? []) as ProfileNameRow[]).map((profile) => [profile.id, profile]));
  const itemsByOrderId = orderItems.reduce((map, item) => {
    const existing = map.get(item.order_id) ?? [];
    existing.push({
      ...item
    });
    map.set(item.order_id, existing);
    return map;
  }, new Map<string, Array<NonNullable<OrderRow["order_items"]>[number]>>());

  return orderRows.map((row) =>
    mapOrder({
      ...row,
      profiles: cashierProfiles.get(row.cashier_id) ?? null,
      order_items: itemsByOrderId.get(row.id) ?? []
    })
  );
}

async function fetchOrdersRange(params: PaginationParams & { context: "orders" | "sales" }) {
  const { page, limit, from, to } = getRange(params.page, params.limit);
  const search = normalizeSearchTerm(params.search);
  let query = supabase.from("orders").select(ORDER_LIST_SELECT).order("created_at", { ascending: false }).range(from, to + 1);

  if (search) {
    query = query.or(buildOrderSearchFilter(search));
  }

  if (params.dateFrom) {
    query = query.gte("created_at", new Date(params.dateFrom).toISOString());
  }

  if (params.dateTo) {
    query = query.lte("created_at", new Date(params.dateTo).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throwOrderQueryError(error, params.context);
  }

  const rows = ((data ?? []) as OrderRow[]);
  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    data: await hydrateOrders(visibleRows, params.context),
    meta: buildListMeta(page, limit, visibleRows.length, hasMore)
  };
}

async function fetchOrdersForSummary(range?: { from?: string; to?: string }) {
  let query = supabase.from("orders").select(ORDER_SUMMARY_SELECT).order("created_at", { ascending: false });

  if (range?.from) {
    query = query.gte("created_at", new Date(range.from).toISOString());
  }

  if (range?.to) {
    query = query.lte("created_at", new Date(range.to).toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throwOrderQueryError(error, "sales");
  }

  const rows = ((data ?? []) as OrderRow[]).map((row) => ({
    ...row,
    cashier_id: "",
    order_type: "dine_in" as OrderChannel,
    customer_email: null,
    notes: null,
    subtotal: 0,
    discount_total: 0,
    tax_total: 0,
    amount_paid: 0,
    change_due: 0,
    payment_reference: null,
    payment_notes: null,
    queue_number: null,
    queue_sequence: null,
    queue_business_date: null
  }));

  if (rows.length === 0) {
    return [];
  }

  const orderIds = rows.map((row) => row.id);
  const { data: itemsData, error: itemsError } = await supabase.from("order_items").select(ORDER_ITEM_SELECT).in("order_id", orderIds);

  if (itemsError) {
    throwOrderQueryError(itemsError, "sales");
  }

  const itemsByOrderId = ((itemsData ?? []) as OrderItemRow[]).reduce((map, item) => {
    const existing = map.get(item.order_id) ?? [];
    existing.push(item);
    map.set(item.order_id, existing);
    return map;
  }, new Map<string, OrderItemRow[]>());

  return rows.map((row) =>
    mapOrder({
      ...row,
      order_items: itemsByOrderId.get(row.id) ?? []
    })
  );
}

async function fetchProductLinks(productIds: string[]) {
  const [recipeResult, addonResult] = await Promise.all([
    productIds.length > 0 ? supabase.from("product_ingredients").select("product_id").in("product_id", productIds) : Promise.resolve({ data: [], error: null }),
    productIds.length > 0 ? supabase.from("product_addon_links").select("product_id").in("product_id", productIds) : Promise.resolve({ data: [], error: null })
  ]);

  if (recipeResult.error && !isSupabaseSchemaError(recipeResult.error)) {
    throw new Error(formatSupabaseError(recipeResult.error));
  }

  if (addonResult.error && !isSupabaseSchemaError(addonResult.error)) {
    throw new Error(formatSupabaseError(addonResult.error));
  }

  const productsWithRecipes = new Set(((recipeResult.data ?? []) as Array<{ product_id: string }>).map((row) => row.product_id));
  const productsWithAddons = new Set(((addonResult.data ?? []) as Array<{ product_id: string }>).map((row) => row.product_id));

  return { productsWithRecipes, productsWithAddons };
}

async function getProductsPage(params: PaginationParams & { activeOnly?: boolean } = {}): Promise<PaginatedResponse<MenuProduct>> {
  const { page, limit, from, to } = getRange(params.page, params.limit ?? 12);
  const search = normalizeSearchTerm(params.search);
  let query = supabase
    .from("products")
    .select("id, sku, name, description, image_url, price_amount, stock_quantity, low_stock_threshold, is_active, category_id, categories(name)", {
      count: "exact"
    })
    .order("name")
    .range(from, to);

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throwSupabaseError(error);
  }

  const rows = (data ?? []) as ProductRow[];
  const { productsWithRecipes, productsWithAddons } = await fetchProductLinks(rows.map((row) => row.id));

  return {
    data: rows.map((row) =>
      mapProduct(row, {
        hasRecipe: productsWithRecipes.has(row.id),
        hasAddons: productsWithAddons.has(row.id)
      })
    ),
    meta: buildListMeta(page, limit, rows.length, (count ?? 0) > to + 1)
  };
}

async function getInventoryPage(params: PaginationParams = {}): Promise<PaginatedResponse<IngredientRecord>> {
  const { page, limit, from, to } = getRange(params.page, params.limit ?? 20);
  const search = normalizeSearchTerm(params.search);
  let query = supabase
    .from("ingredients")
    .select("id, sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, is_active, created_at, updated_at", {
      count: "exact"
    })
    .order("name")
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%,supplier.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throwSupabaseError(error, "Ingredient inventory tables are not available yet. Apply the latest Supabase migration.");
  }

  return {
    data: ((data ?? []) as IngredientRow[]).map(mapIngredient),
    meta: buildListMeta(page, limit, ((data ?? []) as IngredientRow[]).length, (count ?? 0) > to + 1)
  };
}

async function getDiscountsPage(params: PaginationParams & { activeOnly?: boolean } = {}): Promise<PaginatedResponse<DiscountRecord>> {
  const { page, limit, from, to } = getRange(params.page, params.limit ?? 12);
  const search = normalizeSearchTerm(params.search);
  let query = supabase
    .from("discounts")
    .select("id, code, name, scope, value_type, value_amount, description, allowed_roles, is_active, expires_at", {
      count: "exact"
    })
    .order("name")
    .range(from, to);

  if (params.activeOnly) {
    query = query.eq("is_active", true);
  }

  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throwSupabaseError(error);
  }

  return {
    data: ((data ?? []) as DiscountRow[]).map(mapDiscount),
    meta: buildListMeta(page, limit, ((data ?? []) as DiscountRow[]).length, (count ?? 0) > to + 1)
  };
}

async function getTeamPage(params: PaginationParams = {}): Promise<PaginatedResponse<AuthUser>> {
  const { page, limit, from, to } = getRange(params.page, params.limit ?? 20);
  const search = normalizeSearchTerm(params.search);
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active", { count: "exact" })
    .order("full_name")
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    throwSupabaseError(error);
  }

  return {
    data: ((data ?? []) as ProfileRow[]).map(mapProfile),
    meta: buildListMeta(page, limit, ((data ?? []) as ProfileRow[]).length, (count ?? 0) > to + 1)
  };
}

async function getOrdersPage(params: PaginationParams = {}): Promise<PaginatedResponse<OrderListItem>> {
  return fetchOrdersRange({ ...params, limit: params.limit ?? 20, context: "orders" });
}

async function getSalesOrdersPage(params: PaginationParams = {}): Promise<PaginatedResponse<OrderListItem>> {
  return fetchOrdersRange({ ...params, limit: params.limit ?? 20, context: "sales" });
}

async function getSettings(): Promise<CafeSettings> {
  const { data, error } = await supabase.from("business_settings").select(BUSINESS_SETTINGS_SELECT).eq("settings_key", "default").maybeSingle();

  if (error) {
    if (isSupabaseSchemaError(error)) {
      return mergeCafeSettings();
    }

    throwSupabaseError(error);
  }

  return data ? mapCafeSettingsRow(data as BusinessSettingsRow) : mergeCafeSettings();
}

async function getDashboardSummary(): Promise<DashboardSummary> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [productsResult, ingredientsResult, ordersTodayResult, recentOrdersResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, sku, name, description, image_url, price_amount, stock_quantity, low_stock_threshold, is_active, category_id, categories(name)")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("ingredients")
      .select("id, sku, name, category, unit, quantity_on_hand, low_stock_threshold, cost_per_unit, supplier, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase.from("orders").select("grand_total", { count: "exact" }).gte("created_at", startOfDay.toISOString()),
    supabase.from("orders").select(ORDER_RECENT_SELECT).order("created_at", { ascending: false }).range(0, 4)
  ]);

  if (productsResult.error) {
    throwSupabaseError(productsResult.error);
  }

  if (ingredientsResult.error && !isSupabaseSchemaError(ingredientsResult.error)) {
    throwSupabaseError(ingredientsResult.error);
  }

  if (ordersTodayResult.error) {
    throwSupabaseError(ordersTodayResult.error);
  }

  if (recentOrdersResult.error) {
    throwOrderQueryError(recentOrdersResult.error, "orders");
  }

  const activeProducts = ((productsResult.data ?? []) as ProductRow[]).map((row) => mapProduct(row));
  const activeIngredients = ((ingredientsResult.data ?? []) as IngredientRow[]).map(mapIngredient);
  const recentOrderRows = (recentOrdersResult.data ?? []) as RecentOrderRow[];
  const recentCashierIds = [...new Set(recentOrderRows.map((row) => row.cashier_id))];
  const recentProfilesResult =
    recentCashierIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", recentCashierIds)
      : { data: [], error: null };

  if (recentProfilesResult.error && !isSupabaseSchemaError(recentProfilesResult.error)) {
    logSupabaseError("dashboard-profiles", recentProfilesResult.error);
  }

  const cashierProfiles = new Map(((recentProfilesResult.data ?? []) as ProfileNameRow[]).map((profile) => [profile.id, profile]));
  const recentOrders = recentOrderRows.map((row) =>
    mapOrder({
      ...row,
      order_type: "dine_in" as OrderChannel,
      customer_email: null,
      notes: null,
      subtotal: 0,
      discount_total: 0,
      tax_total: 0,
      amount_paid: 0,
      change_due: 0,
      payment_reference: null,
      payment_notes: null,
      queue_number: null,
      queue_sequence: null,
      queue_business_date: null,
      profiles: cashierProfiles.get(row.cashier_id) ?? null,
      order_items: []
    })
  );

  return {
    revenueToday: ordersTodayResult.data?.reduce((sum, order) => sum + toNumber(order.grand_total as number | string), 0) ?? 0,
    ordersToday: ordersTodayResult.count ?? 0,
    activeProducts: activeProducts.length,
    lowStockItems: activeProducts.filter((product) => product.stockQuantity <= product.lowStockThreshold),
    lowStockIngredients: activeIngredients.filter((ingredient) => ingredient.quantityOnHand <= ingredient.lowStockThreshold),
    recentOrders
  };
}

async function getSalesSummary(range?: { from?: string; to?: string }): Promise<SalesSummary> {
  const orders = await fetchOrdersForSummary(range);
  const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId)))];
  const productCategoriesResult =
    productIds.length > 0
      ? await supabase.from("products").select("id, categories(name)").in("id", productIds)
      : { data: [], error: null };

  if (productCategoriesResult.error && !isSupabaseSchemaError(productCategoriesResult.error)) {
    throw new Error(formatSupabaseError(productCategoriesResult.error));
  }

  const productCategoryMap = new Map<string, string>();

  for (const row of productCategoriesResult.data ?? []) {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    productCategoryMap.set(row.id as string, (category?.name as string | undefined) ?? "Uncategorized");
  }

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

export const sidebarDataClient = {
  getDashboardSummary,
  getDiscountsPage,
  getInventoryPage,
  getOrdersPage,
  getProductsPage,
  getSalesOrdersPage,
  getSalesSummary,
  getSettings,
  getTeamPage
};
