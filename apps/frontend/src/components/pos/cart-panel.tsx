import { useEffect, useEffectEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { usePosStore } from "@/stores/pos-store";

const channels = [
  { value: "dine_in", label: "Dine in" },
  { value: "takeout", label: "Takeout" },
  { value: "delivery", label: "Delivery" }
] as const;

export function CartPanel() {
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const { cart, channel, paymentSummary, removeItem, clearCart, setChannel } = usePosStore();
  const token = useAuthStore((state) => state.token);

  const openPayment = useEffectEvent(() => {
    if (cart.length > 0) {
      setPaymentOpen(true);
    }
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("Terminal session expired.");
      }

      return apiClient.createOrder(
        {
          order_type: channel,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity
          }))
        },
        token
      );
    },
    onSuccess: (result) => {
      toast.success(`Order ${result.order_number} opened`, {
        description: `Ticket total PHP ${result.grand_total.toFixed(2)}`
      });
      clearCart();
      setPaymentOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
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
      <Card className="sticky top-28 flex h-fit flex-col gap-5 p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live cart</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Order builder</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          {channels.map((item) => (
            <button
              key={item.value}
              onClick={() => setChannel(item.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                channel === item.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Add products to begin a new ticket.
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{item.product.name}</div>
                    <div className="text-sm text-slate-500">Qty {item.quantity}</div>
                  </div>
                  <button className="text-sm font-semibold text-rose-500" onClick={() => removeItem(item.product.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 rounded-2xl bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Subtotal</span>
            <span>PHP {paymentSummary.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Tax</span>
            <span>PHP {paymentSummary.taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>PHP {paymentSummary.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid gap-3">
          <Button size="lg" onClick={openPayment}>
            <Wallet className="mr-2 h-4 w-4" />
            Charge customer
          </Button>
          <Button variant="ghost" onClick={clearCart}>
            Clear order
          </Button>
        </div>
      </Card>

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[32px] bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Checkout</div>
                <h4 className="mt-1 text-2xl font-semibold text-slate-950">Payment orchestration</h4>
              </div>
              <button className="text-sm font-semibold text-slate-500" onClick={() => setPaymentOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-3">
              {["Cash", "Card", "GCash", "Maya", "Split payment"].map((method) => (
                <button
                  key={method}
                  disabled={orderMutation.isPending}
                  onClick={() => orderMutation.mutate()}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:border-slate-950"
                >
                  <span className="font-medium text-slate-900">{method}</span>
                  <span className="text-sm text-slate-500">
                    {orderMutation.isPending ? "Submitting..." : "Ready"}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}
