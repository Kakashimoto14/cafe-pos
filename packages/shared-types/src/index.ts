export type OrderChannel = "dine_in" | "takeout" | "delivery";
export type AppRole = "admin" | "manager" | "cashier";

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
  tags: string[];
  isActive: boolean;
};

export type PaymentSummary = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
};

export type PaymentProvider = "cash" | "card" | "gcash" | "maya" | "qr";

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

export type DashboardSummary = {
  revenueToday: number;
  ordersToday: number;
  activeProducts: number;
  lowStockItems: MenuProduct[];
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
  taxTotal: number;
  grandTotal: number;
  createdAt: string;
  items: OrderLineItem[];
};

export type OrderPayload = {
  order_type: OrderChannel;
  payment_method: PaymentProvider;
  notes?: string;
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
  imageUrl: string;
  isActive: boolean;
};

export type CategoryFormValues = {
  id?: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};
