import { create } from "zustand";
import type { CartItemAddon, DiscountRecord, MenuProduct, OrderChannel, PaymentProvider, PaymentSummary } from "@cafe/shared-types";

export type CartItem = {
  key: string;
  product: MenuProduct;
  quantity: number;
  addons: CartItemAddon[];
  notes?: string;
};

export type PaymentDraft = {
  method: PaymentProvider;
  amountTendered: number;
  referenceNumber: string;
  notes: string;
};

type PosState = {
  channel: OrderChannel;
  cart: CartItem[];
  selectedDiscount: DiscountRecord | null;
  paymentDraft: PaymentDraft;
  paymentSummary: PaymentSummary;
  setChannel: (channel: OrderChannel) => void;
  addItem: (product: MenuProduct, addons?: CartItemAddon[]) => boolean;
  updateItemQuantity: (itemKey: string, nextQuantity: number) => void;
  removeItem: (itemKey: string) => void;
  setDiscount: (discount: DiscountRecord | null) => void;
  setPaymentMethod: (method: PaymentProvider) => void;
  setAmountTendered: (amount: number) => void;
  setReferenceNumber: (value: string) => void;
  setPaymentNotes: (value: string) => void;
  resetCheckout: () => void;
  clearCart: () => void;
};

const defaultPaymentDraft: PaymentDraft = {
  method: "cash",
  amountTendered: 0,
  referenceNumber: "",
  notes: ""
};

const emptySummary: PaymentSummary = {
  subtotal: 0,
  discountTotal: 0,
  taxableSubtotal: 0,
  taxTotal: 0,
  grandTotal: 0
};

function calculateDiscount(subtotal: number, discount: DiscountRecord | null) {
  if (!discount) {
    return 0;
  }

  if (discount.valueType === "percent") {
    return Number((subtotal * (discount.valueAmount / 100)).toFixed(2));
  }

  return Math.min(subtotal, discount.valueAmount);
}

function buildSummary(cart: CartItem[], discount: DiscountRecord | null): PaymentSummary {
  const subtotal = cart.reduce((sum, item) => {
    const addonTotal = item.addons.reduce((addonSum, addon) => addonSum + addon.priceDelta * addon.quantity, 0);
    return sum + (item.product.price + addonTotal) * item.quantity;
  }, 0);
  const discountTotal = calculateDiscount(subtotal, discount);
  const taxableSubtotal = Number(Math.max(subtotal - discountTotal, 0).toFixed(2));
  const taxTotal = Number((taxableSubtotal * 0.12).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal,
    taxableSubtotal,
    taxTotal,
    grandTotal: Number((taxableSubtotal + taxTotal).toFixed(2))
  };
}

function buildCartKey(productId: string, addons: CartItemAddon[] = []) {
  const normalizedAddons = addons
    .filter((addon) => addon.quantity > 0)
    .map((addon) => `${addon.addonId}:${addon.quantity}`)
    .sort()
    .join("|");

  return normalizedAddons ? `${productId}|${normalizedAddons}` : productId;
}

function resetDraftForMethod(method: PaymentProvider, previous: PaymentDraft): PaymentDraft {
  return {
    method,
    amountTendered: method === "cash" ? previous.amountTendered : 0,
    referenceNumber: "",
    notes: ""
  };
}

export const usePosStore = create<PosState>((set) => ({
  channel: "dine_in",
  cart: [],
  selectedDiscount: null,
  paymentDraft: defaultPaymentDraft,
  paymentSummary: emptySummary,
  setChannel: (channel) => set({ channel }),
  addItem: (product, addons = []) => {
    let added = false;

    set((state) => {
      const key = buildCartKey(product.id, addons);
      const existing = state.cart.find((item) => item.key === key);
      const nextQuantity = (existing?.quantity ?? 0) + 1;
      const otherProductQuantity = state.cart
        .filter((item) => item.product.id === product.id && item.key !== key)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (nextQuantity + otherProductQuantity > product.stockQuantity) {
        return state;
      }

      added = true;

      const cart = existing
        ? state.cart.map((item) => (item.key === key ? { ...item, quantity: nextQuantity } : item))
        : [...state.cart, { key, product, quantity: 1, addons }];

      const paymentSummary = buildSummary(cart, state.selectedDiscount);
      const paymentDraft = {
        ...state.paymentDraft,
        amountTendered:
          state.paymentDraft.method === "cash" && state.paymentDraft.amountTendered === 0
            ? paymentSummary.grandTotal
            : state.paymentDraft.amountTendered
      };

      return { cart, paymentSummary, paymentDraft };
    });

    return added;
  },
  updateItemQuantity: (itemKey, nextQuantity) =>
    set((state) => {
      const source = state.cart.find((item) => item.key === itemKey);

      if (!source) {
        return state;
      }

      const otherProductQuantity = state.cart
        .filter((item) => item.product.id === source.product.id && item.key !== itemKey)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (nextQuantity + otherProductQuantity > source.product.stockQuantity) {
        return state;
      }

      const cart =
        nextQuantity <= 0
          ? state.cart.filter((item) => item.key !== itemKey)
          : state.cart.map((item) => (item.key === itemKey ? { ...item, quantity: nextQuantity } : item));

      const paymentSummary = buildSummary(cart, state.selectedDiscount);

      return {
        cart,
        paymentSummary,
        paymentDraft:
          state.paymentDraft.method === "cash"
            ? {
                ...state.paymentDraft,
                amountTendered:
                  state.paymentDraft.amountTendered < paymentSummary.grandTotal
                    ? paymentSummary.grandTotal
                    : state.paymentDraft.amountTendered
              }
            : state.paymentDraft
      };
    }),
  removeItem: (itemKey) =>
    set((state) => {
      const cart = state.cart.filter((item) => item.key !== itemKey);
      return {
        cart,
        paymentSummary: buildSummary(cart, state.selectedDiscount)
      };
    }),
  setDiscount: (discount) =>
    set((state) => {
      const paymentSummary = buildSummary(state.cart, discount);
      return {
        selectedDiscount: discount,
        paymentSummary,
        paymentDraft:
          state.paymentDraft.method === "cash"
            ? {
                ...state.paymentDraft,
                amountTendered:
                  state.paymentDraft.amountTendered < paymentSummary.grandTotal
                    ? paymentSummary.grandTotal
                    : state.paymentDraft.amountTendered
              }
            : state.paymentDraft
      };
    }),
  setPaymentMethod: (method) =>
    set((state) => ({
      paymentDraft: {
        ...resetDraftForMethod(method, state.paymentDraft),
        amountTendered: method === "cash" ? state.paymentSummary.grandTotal : 0
      }
    })),
  setAmountTendered: (amount) =>
    set((state) => ({
      paymentDraft: {
        ...state.paymentDraft,
        amountTendered: Number.isFinite(amount) ? amount : 0
      }
    })),
  setReferenceNumber: (value) =>
    set((state) => ({
      paymentDraft: {
        ...state.paymentDraft,
        referenceNumber: value
      }
    })),
  setPaymentNotes: (value) =>
    set((state) => ({
      paymentDraft: {
        ...state.paymentDraft,
        notes: value
      }
    })),
  resetCheckout: () =>
    set((state) => {
      const paymentSummary = buildSummary(state.cart, null);

      return {
        selectedDiscount: null,
        paymentSummary,
        paymentDraft: {
          ...defaultPaymentDraft,
          amountTendered: paymentSummary.grandTotal
        }
      };
    }),
  clearCart: () =>
    set({
      cart: [],
      selectedDiscount: null,
      paymentDraft: defaultPaymentDraft,
      paymentSummary: emptySummary
    })
}));
