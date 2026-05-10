export type OrderChannel = "dine_in" | "takeout" | "delivery";

export type MenuProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl?: string;
  tags: string[];
  isActive?: boolean;
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
  role: string;
  isActive: boolean;
};

export type OrderPayload = {
  order_type: OrderChannel;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
};
