import { create } from "zustand";
import type { DiscountRecord, MenuProduct, OrderChannel, PaymentProvider, PaymentSummary } from "@cafe/shared-types";

export type CartItem = {
  product: MenuProduct;
  quantity: number;
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
  addItem: (product: MenuProduct) => boolean;
  updateItemQuantity: (productId: string, nextQuantity: number) => void;
  removeItem: (productId: string) => void;
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
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
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
  addItem: (product) => {
    let added = false;

    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id);
      const nextQuantity = (existing?.quantity ?? 0) + 1;

      if (nextQuantity > product.stockQuantity) {
        return state;
      }

      added = true;

      const cart = existing
        ? state.cart.map((item) => (item.product.id === product.id ? { ...item, quantity: nextQuantity } : item))
        : [...state.cart, { product, quantity: 1 }];

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
  updateItemQuantity: (productId, nextQuantity) =>
    set((state) => {
      const source = state.cart.find((item) => item.product.id === productId);

      if (!source) {
        return state;
      }

      if (nextQuantity > source.product.stockQuantity) {
        return state;
      }

      const cart =
        nextQuantity <= 0
          ? state.cart.filter((item) => item.product.id !== productId)
          : state.cart.map((item) => (item.product.id === productId ? { ...item, quantity: nextQuantity } : item));

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
  removeItem: (productId) =>
    set((state) => {
      const cart = state.cart.filter((item) => item.product.id !== productId);
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
