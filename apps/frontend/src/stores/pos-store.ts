import { create } from "zustand";
import type { MenuProduct, OrderChannel, PaymentSummary } from "@cafe/shared-types";

type CartItem = {
  product: MenuProduct;
  quantity: number;
  notes?: string;
};

type PosState = {
  channel: OrderChannel;
  cart: CartItem[];
  paymentSummary: PaymentSummary;
  setChannel: (channel: OrderChannel) => void;
  addItem: (product: MenuProduct) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const emptySummary: PaymentSummary = {
  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  grandTotal: 0
};

function buildSummary(cart: CartItem[]): PaymentSummary {
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxTotal = Number((subtotal * 0.12).toFixed(2));

  return {
    subtotal,
    discountTotal: 0,
    taxTotal,
    grandTotal: Number((subtotal + taxTotal).toFixed(2))
  };
}

export const usePosStore = create<PosState>((set) => ({
  channel: "dine_in",
  cart: [],
  paymentSummary: emptySummary,
  setChannel: (channel) => set({ channel }),
  addItem: (product) =>
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id);
      const cart = existing
        ? state.cart.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...state.cart, { product, quantity: 1 }];

      return { cart, paymentSummary: buildSummary(cart) };
    }),
  removeItem: (productId) =>
    set((state) => {
      const cart = state.cart
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0);

      return { cart, paymentSummary: buildSummary(cart) };
    }),
  clearCart: () => set({ cart: [], paymentSummary: emptySummary })
}));
