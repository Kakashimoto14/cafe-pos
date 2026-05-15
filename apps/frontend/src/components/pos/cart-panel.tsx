import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Minus, Plus, QrCode, ShoppingBag, TicketPercent, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCafeSettings } from "@/hooks/use-cafe-settings";
import { apiClient } from "@/services/api-client";
import { usePosStore } from "@/stores/pos-store";

const channels = [
  { value: "dine_in", label: "Dine in" },
  { value: "takeout", label: "Takeout" },
  { value: "delivery", label: "Delivery" }
] as const;

const paymentMethods = [
  { label: "Cash", value: "cash" as const, detail: "Tendered amount with automatic change" },
  { label: "GCash", value: "gcash" as const, detail: "Mock digital wallet flow with reference" },
  { label: "QR Payment", value: "qr" as const, detail: "Display a QR placeholder and capture a reference" },
  { label: "InstaPay", value: "instapay" as const, detail: "Bank transfer style mock payment" },
  { label: "Card", value: "card" as const, detail: "Tap or swipe card without a live gateway yet" },
  { label: "Maya", value: "maya" as const, detail: "Alternative wallet flow for future integration" },
  { label: "Other", value: "other" as const, detail: "Manual payment capture with notes" }
];

function formatMoney(value: number, currency = "PHP") {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(value);
  }
}

function getCheckoutErrorMessage(error: Error) {
  const message = error.message || "Something went wrong while completing the order.";

  if (/insufficient stock/i.test(message)) {
    return message;
  }

  if (/insufficient ingredient stock/i.test(message)) {
    return message;
  }

  if (/payment reference/i.test(message)) {
    return "Enter the wallet or bank reference number before completing this order.";
  }

  if (/cash tendered/i.test(message)) {
    return "Enter a cash amount that covers the full order total.";
  }

  if (/discount/i.test(message)) {
    return message;
  }

  if (/customer email/i.test(message)) {
    return "Enter a valid customer email address or leave the field blank.";
  }

  if (/ambiguous|column reference/i.test(message)) {
    return "Checkout hit a database configuration issue. Please refresh and try again.";
  }

  return message;
}

export function CartPanel() {
  const queryClient = useQueryClient();
  const settingsQuery = useCafeSettings();
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [completedOrder, setCompletedOrder] = useState<{ id: string; orderNumber: string; queueNumber?: string; grandTotal: number } | null>(null);
  const cart = usePosStore((state) => state.cart);
  const channel = usePosStore((state) => state.channel);
  const selectedDiscount = usePosStore((state) => state.selectedDiscount);
  const paymentDraft = usePosStore((state) => state.paymentDraft);
  const paymentSummary = usePosStore((state) => state.paymentSummary);
  const setTaxRate = usePosStore((state) => state.setTaxRate);
  const updateItemQuantity = usePosStore((state) => state.updateItemQuantity);
  const removeItem = usePosStore((state) => state.removeItem);
  const clearCart = usePosStore((state) => state.clearCart);
  const setChannel = usePosStore((state) => state.setChannel);
  const setDiscount = usePosStore((state) => state.setDiscount);
  const setPaymentMethod = usePosStore((state) => state.setPaymentMethod);
  const setAmountTendered = usePosStore((state) => state.setAmountTendered);
  const setReferenceNumber = usePosStore((state) => state.setReferenceNumber);
  const setPaymentNotes = usePosStore((state) => state.setPaymentNotes);
  const resetCheckout = usePosStore((state) => state.resetCheckout);
  const currency = settingsQuery.data?.currency ?? "PHP";
  const requiresReference = Boolean(settingsQuery.data?.requirePaymentReference ?? true) && ["gcash", "qr", "instapay"].includes(paymentDraft.method);

  useEffect(() => {
    setTaxRate(settingsQuery.data?.taxRate ?? 12);
  }, [setTaxRate, settingsQuery.data?.taxRate]);

  const discountsQuery = useQuery({
    queryKey: ["discounts", "active"],
    queryFn: () => apiClient.discounts({ activeOnly: true })
  });

  const openPayment = useEffectEvent(() => {
    if (cart.length > 0) {
      setPaymentOpen(true);

      if (paymentDraft.method === "cash" && paymentDraft.amountTendered < paymentSummary.grandTotal) {
        setAmountTendered(paymentSummary.grandTotal);
      }
    }
  });

  const closePayment = useEffectEvent(() => {
    setPaymentOpen(false);
  });

  const changePreview = useMemo(() => {
    if (paymentDraft.method !== "cash") {
      return 0;
    }

    return Number(Math.max(paymentDraft.amountTendered - paymentSummary.grandTotal, 0).toFixed(2));
  }, [paymentDraft.amountTendered, paymentDraft.method, paymentSummary.grandTotal]);

  const checkoutBlocked =
    cart.length === 0 ||
    (paymentDraft.method === "cash" && paymentDraft.amountTendered < paymentSummary.grandTotal) ||
    (requiresReference && paymentDraft.referenceNumber.trim().length === 0);

  const orderMutation = useMutation({
    mutationFn: async () => {
      return apiClient.createOrder({
        order_type: channel,
        payment_method: paymentDraft.method,
        customer_email: customerEmail.trim() || undefined,
        discount_id: selectedDiscount?.id,
        amount_paid: paymentDraft.method === "cash" ? paymentDraft.amountTendered : undefined,
        payment_reference: paymentDraft.referenceNumber.trim() || undefined,
        payment_notes: paymentDraft.notes.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          addons: item.addons.map((addon) => ({
            addon_id: addon.addonId,
            quantity: addon.quantity
          }))
        }))
      });
    },
    onSuccess: (result) => {
      toast.success(`Order ${result.orderNumber} completed`, {
        description: `${result.queueNumber ? `${result.queueNumber} ready - ` : ""}Receipt total ${formatMoney(result.grandTotal, currency)}`
      });
      setCompletedOrder(result);
      if (settingsQuery.data?.autoPrintReceipt) {
        window.open(`/orders/${result.id}/receipt`, "_blank", "noopener,noreferrer");
      }
      clearCart();
      resetCheckout();
      setOrderNotes("");
      setCustomerEmail("");
      setPaymentOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      void queryClient.invalidateQueries({ queryKey: ["ingredient-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error) => {
      console.error("Unable to complete POS order", error);
      toast.error("Order could not be completed", {
        description: getCheckoutErrorMessage(error)
      });
    }
  });

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
        openPayment();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [openPayment]);

  return (
    <>
      <Card className="flex min-h-[620px] flex-col gap-4 border-[#eadbcb] bg-white p-5 xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:min-h-0">
        <div className="shrink-0">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Current order</div>
          <h3 className="mt-2 text-2xl font-semibold text-[#241610]">Cart summary</h3>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2 rounded-2xl bg-[#f7efe5] p-1">
          {channels.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setChannel(item.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                channel === item.value ? "bg-white text-[#3b2418] shadow-sm" : "text-[#7b685c]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-center text-sm text-[#7b685c]">
              <ShoppingBag className="mx-auto mb-3 h-6 w-6 text-[#b38d72]" />
              Add products to begin a new ticket.
            </div>
          ) : (
            cart.map((item) => {
              const addonTotal = item.addons.reduce((sum, addon) => sum + addon.priceDelta * addon.quantity, 0);

              return (
              <div key={item.key} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-[#241610]">{item.product.name}</div>
                    <div className="mt-1 text-sm text-[#7b685c]">{formatMoney(item.product.price, currency)} each</div>
                    {item.addons.length > 0 ? (
                      <div className="mt-2 space-y-1 text-sm text-[#7b685c]">
                        {item.addons.map((addon) => (
                          <div key={addon.addonId}>
                            + {addon.name}
                            {addon.quantity > 1 ? ` x${addon.quantity}` : ""} / {formatMoney(addon.priceDelta * addon.quantity, currency)}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button className="text-sm font-semibold text-[#a14f43]" type="button" onClick={() => removeItem(item.key)}>
                    Remove
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#eadbcb] bg-white px-2 py-1">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.key, item.quantity - 1)}
                      className="rounded-full p-1 text-[#7a4a2e] hover:bg-[#f3e7d8]"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-[#241610]">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.key, item.quantity + 1)}
                      className="rounded-full p-1 text-[#7a4a2e] hover:bg-[#f3e7d8]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-[#241610]">{formatMoney((item.product.price + addonTotal) * item.quantity, currency)}</div>
                </div>
              </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 space-y-2 rounded-[24px] border border-[#eadbcb] bg-[linear-gradient(180deg,#fff8ef,#f4e8da)] p-4 text-[#241610]">
          <div className="flex items-center justify-between text-sm text-[#7b685c]">
            <span>Subtotal</span>
            <span>{formatMoney(paymentSummary.subtotal, currency)}</span>
          </div>
          {paymentSummary.discountTotal > 0 ? (
            <div className="flex items-center justify-between text-sm text-[#7b685c]">
              <span>Discount</span>
              <span>-{formatMoney(paymentSummary.discountTotal, currency)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-sm text-[#7b685c]">
            <span>Taxable amount</span>
            <span>{formatMoney(paymentSummary.taxableSubtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-[#7b685c]">
            <span>Tax</span>
            <span>{formatMoney(paymentSummary.taxTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-semibold text-[#3b2418]">
            <span>Total</span>
            <span>{formatMoney(paymentSummary.grandTotal, currency)}</span>
          </div>
        </div>

        <div className="grid shrink-0 gap-3">
          <Button size="lg" onClick={openPayment} disabled={cart.length === 0}>
            <Wallet className="mr-2 h-4 w-4" />
            Charge customer
          </Button>
          <Button variant="ghost" onClick={clearCart} disabled={cart.length === 0}>
            Clear order
          </Button>
        </div>
      </Card>

      {cart.length > 0 ? (
        <div className="fixed inset-x-4 bottom-24 z-30 rounded-[24px] border border-[#d9c2ac] bg-white/95 p-3 shadow-[0_20px_45px_rgba(74,43,24,0.2)] backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7767]">{cart.length} item ticket</div>
              <div className="mt-1 text-lg font-semibold text-[#241610]">{formatMoney(paymentSummary.grandTotal, currency)}</div>
            </div>
            <Button size="lg" onClick={openPayment}>
              Checkout
            </Button>
          </div>
        </div>
      ) : null}

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-[#eadbcb] bg-white p-6 shadow-[0_30px_70px_rgba(74,43,24,0.18)]"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Checkout</div>
                <h4 className="mt-1 text-2xl font-semibold text-[#241610]">Complete this cafe order</h4>
              </div>
              <button className="text-sm font-semibold text-[#7b685c]" type="button" onClick={closePayment}>
                Close
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_420px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-[#eadbcb] bg-[#fffaf4] p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                      <TicketPercent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Discount</div>
                      <h5 className="mt-1 text-xl font-semibold text-[#241610]">Apply an order adjustment</h5>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDiscount(null)}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        selectedDiscount === null ? "border-[#cba57f] bg-white shadow-sm" : "border-[#eadbcb] bg-[#fffdf9]"
                      }`}
                    >
                      <div className="font-medium text-[#241610]">No discount</div>
                      <div className="mt-1 text-sm text-[#7b685c]">Charge the standard menu price.</div>
                    </button>
                    {(discountsQuery.data ?? []).map((discount) => (
                      <button
                        key={discount.id}
                        type="button"
                        onClick={() => setDiscount(discount)}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          selectedDiscount?.id === discount.id
                            ? "border-[#cba57f] bg-white shadow-sm"
                            : "border-[#eadbcb] bg-[#fffdf9]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-[#241610]">{discount.name}</div>
                          <span className="rounded-full bg-[#f3e7d8] px-3 py-1 text-xs font-semibold text-[#7a4a2e]">
                            {discount.valueType === "percent" ? `${discount.valueAmount}%` : formatMoney(discount.valueAmount, currency)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-[#7b685c]">
                          {discount.code} / {discount.scope}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#eadbcb] bg-[#fffaf4] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Payment method</div>
                  <h5 className="mt-1 text-xl font-semibold text-[#241610]">Choose how the guest will pay</h5>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          paymentDraft.method === method.value
                            ? "border-[#cba57f] bg-white shadow-sm"
                            : "border-[#eadbcb] bg-[#fffdf9]"
                        }`}
                      >
                        <div className="font-medium text-[#241610]">{method.label}</div>
                        <div className="mt-2 text-sm text-[#7b685c]">{method.detail}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {paymentDraft.method === "cash" ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[#5f4637]">Amount tendered</span>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentDraft.amountTendered}
                          onChange={(event) => setAmountTendered(Number(event.target.value))}
                          className="h-12 w-full rounded-2xl bg-white px-4"
                        />
                      </label>
                    ) : (
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[#5f4637]">
                          {["gcash", "qr", "instapay"].includes(paymentDraft.method) ? "Reference number" : "Reference (optional)"}
                        </span>
                        <input
                          value={paymentDraft.referenceNumber}
                          onChange={(event) => setReferenceNumber(event.target.value)}
                          className="h-12 w-full rounded-2xl bg-white px-4"
                          placeholder="Enter payment reference"
                        />
                      </label>
                    )}

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#5f4637]">Order note</span>
                      <input
                        value={orderNotes}
                        onChange={(event) => setOrderNotes(event.target.value)}
                        className="h-12 w-full rounded-2xl bg-white px-4"
                        placeholder="Special prep or service note"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[#5f4637]">Customer email (optional)</span>
                      <input
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        className="h-12 w-full rounded-2xl bg-white px-4"
                        placeholder="guest@example.com"
                        inputMode="email"
                      />
                      <p className="text-xs text-[#8f7767]">This is stored on the order so the receipt page can email the guest without retyping it later.</p>
                    </label>
                  </div>

                  {paymentDraft.method !== "cash" ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
                      <div className="grid place-items-center rounded-[24px] border border-dashed border-[#d9c2ac] bg-white p-6">
                        <QrCode className="h-24 w-24 text-[#c08a5a]" />
                        <div className="mt-3 text-center text-sm text-[#7b685c]">Mock QR / wallet handoff</div>
                      </div>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-[#5f4637]">Payment note</span>
                        <textarea
                          value={paymentDraft.notes}
                          onChange={(event) => setPaymentNotes(event.target.value)}
                          rows={5}
                          className="w-full rounded-2xl bg-white px-4 py-3"
                          placeholder="Add confirmation details or cashier note"
                        />
                      </label>
                    </div>
                  ) : null}
                </section>
              </div>

              <Card className="border-[#eadbcb] bg-[#fffdf9] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Order totals</div>
                <h5 className="mt-1 text-xl font-semibold text-[#241610]">Ready to charge</h5>

                <div className="mt-5 space-y-3 rounded-[24px] border border-[#eadbcb] bg-white p-4">
                  {cart.map((item) => {
                    const addonTotal = item.addons.reduce((sum, addon) => sum + addon.priceDelta * addon.quantity, 0);

                    return (
                    <div key={item.key} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium text-[#241610]">{item.product.name}</div>
                        <div className="text-[#7b685c]">Qty {item.quantity}</div>
                        {item.addons.length > 0 ? (
                          <div className="mt-1 space-y-0.5 text-xs text-[#7b685c]">
                            {item.addons.map((addon) => (
                              <div key={addon.addonId}>
                                + {addon.name}
                                {addon.quantity > 1 ? ` x${addon.quantity}` : ""}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="font-medium text-[#241610]">{formatMoney((item.product.price + addonTotal) * item.quantity, currency)}</div>
                    </div>
                    );
                  })}
                </div>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-[#7b685c]">
                    <span>Subtotal</span>
                    <span>{formatMoney(paymentSummary.subtotal, currency)}</span>
                  </div>
                  {selectedDiscount ? (
                    <div className="flex items-center justify-between text-[#7b685c]">
                      <span>{selectedDiscount.name}</span>
                      <span>-{formatMoney(paymentSummary.discountTotal, currency)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-[#7b685c]">
                    <span>Tax</span>
                    <span>{formatMoney(paymentSummary.taxTotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-semibold text-[#241610]">
                    <span>Total due</span>
                    <span>{formatMoney(paymentSummary.grandTotal, currency)}</span>
                  </div>
                  {paymentDraft.method === "cash" ? (
                    <>
                      <div className="flex items-center justify-between text-[#7b685c]">
                        <span>Amount tendered</span>
                        <span>{formatMoney(paymentDraft.amountTendered, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold text-[#3b2418]">
                        <span>Change</span>
                        <span>{formatMoney(changePreview, currency)}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3">
                  <Button size="lg" onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending || checkoutBlocked}>
                    {orderMutation.isPending ? "Submitting..." : "Complete order"}
                  </Button>
                  <Button variant="ghost" onClick={closePayment}>
                    Back to cart
                  </Button>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      ) : null}

      {completedOrder ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-[32px] border border-[#eadbcb] bg-white p-6 shadow-[0_30px_70px_rgba(74,43,24,0.18)]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Receipt ready</div>
            <h4 className="mt-2 text-2xl font-semibold text-[#241610]">{completedOrder.orderNumber} is complete</h4>
            {completedOrder.queueNumber ? (
              <div className="mt-4 inline-flex rounded-full border border-[#d9c2ac] bg-[#fff7ef] px-4 py-2 text-base font-semibold tracking-[0.18em] text-[#7a4a2e]">
                Queue No: {completedOrder.queueNumber}
              </div>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-[#7b685c]">
              The order has been recorded, stock was deducted, and the receipt can be opened in a print-friendly view.
            </p>
            <div className="mt-6 grid gap-3">
              <a
                href={`/orders/${completedOrder.id}/receipt`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_18px_32px_rgba(122,74,46,0.18)] transition hover:-translate-y-0.5 hover:bg-[#6e4228]"
              >
                Print receipt
              </a>
              <Button type="button" variant="ghost" onClick={() => setCompletedOrder(null)}>
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}
