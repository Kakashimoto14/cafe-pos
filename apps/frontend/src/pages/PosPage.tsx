import { useQuery } from "@tanstack/react-query";
import { Clock3, Keyboard, ScanLine, TimerReset } from "lucide-react";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

export function PosPage() {
  const productsQuery = useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => apiClient.products({ activeOnly: true })
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => apiClient.categories({ activeOnly: true })
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_420px]">
      <div className="space-y-6">
        <Card className="overflow-hidden border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Cashier terminal</div>
              <h2 className="mt-3 font-display text-4xl text-[#241610]">Serve the line with less friction</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
                Search products fast, tap to add, and send a clean order through checkout without losing your place at the counter.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-[#d9c2ac] bg-white px-4 py-4 text-[#241610] shadow-[0_16px_30px_rgba(74,43,24,0.08)]">
                <div className="flex items-center gap-2 text-sm text-[#8f7767]">
                  <Clock3 className="h-4 w-4" />
                  Average ticket time
                </div>
                <div className="mt-2 text-2xl font-semibold">48 sec</div>
              </div>
              <div className="rounded-[24px] border border-[#dce8d9] bg-[#f5fbf4] px-4 py-4 text-[#2f4b31] shadow-[0_16px_30px_rgba(74,43,24,0.05)]">
                <div className="flex items-center gap-2 text-sm text-[#537554]">
                  <TimerReset className="h-4 w-4" />
                  Sync status
                </div>
                <div className="mt-2 text-2xl font-semibold">Realtime</div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#eadbcb] bg-white/85 p-4 text-sm leading-6 text-[#6c584b]">
              <ScanLine className="mb-3 h-5 w-5 text-[#7a4a2e]" />
              POS is reading from the live Supabase catalog with real stock checks on every completed sale.
            </div>
            <div className="rounded-[24px] border border-[#eadbcb] bg-white/85 p-4 text-sm leading-6 text-[#6c584b]">
              <Keyboard className="mb-3 h-5 w-5 text-[#7a4a2e]" />
              `Ctrl/Cmd + Enter` opens checkout for keyboard-first cashiers.
            </div>
            <div className="rounded-[24px] border border-[#eadbcb] bg-white/85 p-4 text-sm leading-6 text-[#6c584b]">
              Discounts, mock digital payments, and printable receipts are ready inside checkout.
            </div>
          </div>
        </Card>
        {productsQuery.isLoading || categoriesQuery.isLoading ? (
          <Card className="p-6 text-sm text-[#7b685c]">Loading live catalog...</Card>
        ) : productsQuery.isError ? (
          <Card className="p-6 text-sm text-rose-500">{productsQuery.error.message}</Card>
        ) : categoriesQuery.isError ? (
          <Card className="p-6 text-sm text-rose-500">{categoriesQuery.error.message}</Card>
        ) : (
          <ProductGrid products={productsQuery.data ?? []} categories={categoriesQuery.data ?? []} />
        )}
      </div>
      <CartPanel />
    </div>
  );
}
