import { useQuery } from "@tanstack/react-query";
import { Clock3, Keyboard, ScanLine, TimerReset } from "lucide-react";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

export function PosPage() {
  const token = useAuthStore((state) => state.token);
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => apiClient.products(token ?? ""),
    enabled: Boolean(token)
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.7fr_420px]">
      <div className="space-y-6">
        <Card className="overflow-hidden p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Counter mode</div>
              <h2 className="mt-3 font-display text-4xl text-slate-950">Fast lane checkout</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                Designed for barcode-first, touch-friendly order entry with instant cart updates and a one-motion payment handoff.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Clock3 className="h-4 w-4" />
                  Average ticket time
                </div>
                <div className="mt-2 text-2xl font-semibold">48 sec</div>
              </div>
              <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-900">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <TimerReset className="h-4 w-4" />
                  Sync status
                </div>
                <div className="mt-2 text-2xl font-semibold">Realtime</div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/60 bg-slate-50 p-4 text-sm text-slate-600">
              <ScanLine className="mb-3 h-5 w-5 text-slate-900" />
              Barcode pipeline reserved for USB and camera scanner adapters.
            </div>
            <div className="rounded-2xl border border-white/60 bg-slate-50 p-4 text-sm text-slate-600">
              <Keyboard className="mb-3 h-5 w-5 text-slate-900" />
              `Ctrl/Cmd + Enter` opens checkout for keyboard-first cashiers.
            </div>
            <div className="rounded-2xl border border-white/60 bg-slate-50 p-4 text-sm text-slate-600">
              Sticky cart keeps totals visible during peak-hour service.
            </div>
          </div>
        </Card>
        {productsQuery.isLoading ? (
          <Card className="p-6 text-sm text-slate-500">Loading live catalog...</Card>
        ) : productsQuery.isError ? (
          <Card className="p-6 text-sm text-rose-500">{productsQuery.error.message}</Card>
        ) : (
          <ProductGrid products={productsQuery.data ?? []} />
        )}
      </div>
      <CartPanel />
    </div>
  );
}
