export type OrderChannel = "dine_in" | "takeout" | "delivery";
export type AppRole = "admin" | "manager" | "cashier";
export type DiscountScope = "senior" | "pwd" | "promo" | "manual";
export type DiscountValueType = "fixed" | "percent";
export type PaymentProvider = "cash" | "card" | "gcash" | "maya" | "qr" | "instapay" | "other";
export type InventoryAdjustmentType = "stock_in" | "stock_out" | "manual" | "sale" | "waste";

export type MenuProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  category: string;
  price: number;
  imageUrl?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  tags: string[];
  isActive: boolean;
};

export type PaymentSummary = {
  subtotal: number;
  discountTotal: number;
  taxableSubtotal: number;
  taxTotal: number;
  grandTotal: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
};

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

export type DiscountRecord = {
  id: string;
  code: string;
  name: string;
  scope: DiscountScope;
  valueType: DiscountValueType;
  valueAmount: number;
  description: string;
  allowedRoles: AppRole[];
  isActive: boolean;
  expiresAt?: string;
};

export type InventoryAdjustmentRecord = {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  adjustmentType: InventoryAdjustmentType;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  referenceOrderId?: string;
  createdAt: string;
};

export type DashboardSummary = {
  revenueToday: number;
  ordersToday: number;
  activeProducts: number;
  lowStockItems: MenuProduct[];
  recentOrders: OrderListItem[];
};

export type SalesSummary = {
  revenueTotal: number;
  ordersCount: number;
  averageOrderValue: number;
  topItems: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: OrderListItem[];
};

export type OrderLineItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  orderType: OrderChannel;
  paymentMethod: PaymentProvider;
  cashierName: string;
  notes?: string;
  subtotal: number;
  discountLabel?: string;
  discountCode?: string;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid: number;
  changeDue: number;
  paymentReference?: string;
  paymentNotes?: string;
  createdAt: string;
  items: OrderLineItem[];
};

export type OrderPayload = {
  order_type: OrderChannel;
  payment_method: PaymentProvider;
  notes?: string;
  discount_id?: string;
  amount_paid?: number;
  payment_reference?: string;
  payment_notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  imageUrl: string;
  isActive: boolean;
};

export type CategoryFormValues = {
  id?: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type DiscountFormValues = {
  id?: string;
  code: string;
  name: string;
  scope: DiscountScope;
  valueType: DiscountValueType;
  valueAmount: number;
  description: string;
  allowedRoles: AppRole[];
  isActive: boolean;
  expiresAt: string;
};
