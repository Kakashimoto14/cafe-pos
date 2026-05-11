export type OrderChannel = "dine_in" | "takeout" | "delivery";
export type AppRole = "admin" | "manager" | "cashier";
export type DiscountScope = "senior" | "pwd" | "promo" | "manual";
export type DiscountValueType = "fixed" | "percent";
export type PaymentProvider = "cash" | "card" | "gcash" | "maya" | "qr" | "instapay" | "other";
export type InventoryAdjustmentType = "stock_in" | "stock_out" | "manual" | "sale" | "waste";
export type IngredientAdjustmentType = InventoryAdjustmentType;

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
  hasRecipe?: boolean;
  hasAddons?: boolean;
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

export type IngredientRecord = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  costPerUnit: number;
  supplier?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type IngredientFormValues = {
  id?: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  costPerUnit: number;
  supplier: string;
  isActive: boolean;
};

export type ProductIngredientRecord = {
  id: string;
  productId: string;
  productName?: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  quantityRequired: number;
  costPerUnit: number;
  createdAt?: string;
};

export type ProductIngredientFormValues = {
  id?: string;
  productId: string;
  ingredientId: string;
  quantityRequired: number;
};

export type IngredientAdjustmentRecord = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  userId: string;
  userName: string;
  adjustmentType: IngredientAdjustmentType;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  referenceOrderId?: string;
  createdAt: string;
};

export type ProductAddonRecord = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  priceDelta: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductAddonFormValues = {
  id?: string;
  name: string;
  sku: string;
  description: string;
  priceDelta: number;
  isActive: boolean;
};

export type ProductAddonIngredientRecord = {
  id: string;
  addonId: string;
  addonName?: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  quantityRequired: number;
  costPerUnit: number;
  createdAt?: string;
};

export type ProductAddonIngredientFormValues = {
  id?: string;
  addonId: string;
  ingredientId: string;
  quantityRequired: number;
};

export type ProductAddonLinkRecord = {
  id: string;
  productId: string;
  productName: string;
  addonId: string;
  addonName: string;
  createdAt?: string;
};

export type ProductAddonLinkFormValues = {
  id?: string;
  productId: string;
  addonId: string;
};

export type OrderItemAddonRecord = {
  id: string;
  orderItemId: string;
  addonId: string;
  addonName: string;
  priceDelta: number;
  quantity: number;
  createdAt?: string;
};

export type CartItemAddon = {
  addonId: string;
  name: string;
  priceDelta: number;
  quantity: number;
};

export type DashboardSummary = {
  revenueToday: number;
  ordersToday: number;
  activeProducts: number;
  lowStockItems: MenuProduct[];
  lowStockIngredients?: IngredientRecord[];
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
  addons?: OrderItemAddonRecord[];
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
    addons?: Array<{
      addon_id: string;
      quantity: number;
    }>;
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
