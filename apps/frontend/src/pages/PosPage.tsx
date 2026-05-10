import { useQuery } from "@tanstack/react-query";
import { Keyboard, ScanLine } from "lucide-react";
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <Card className="overflow-hidden border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Cashier terminal</div>
              <h2 className="mt-2 font-display text-3xl text-[#241610]">Serve the line with less friction</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b685c]">
                Search products fast, tap to add, and send a clean order through checkout without losing your place at the counter.
              </p>
            </div>
            <div className="rounded-[22px] border border-[#d9c2ac] bg-white px-4 py-3 text-[#241610] shadow-[0_14px_28px_rgba(74,43,24,0.06)]">
              <div className="text-sm text-[#8f7767]">Live catalog sync</div>
              <div className="mt-1 text-xl font-semibold">Counter ready</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-[#eadbcb] bg-white/85 p-4 text-sm leading-6 text-[#6c584b]">
              <ScanLine className="mb-3 h-5 w-5 text-[#7a4a2e]" />
              POS is reading from the live Supabase catalog with real stock checks on every completed sale.
            </div>
            <div className="rounded-[22px] border border-[#eadbcb] bg-white/85 p-4 text-sm leading-6 text-[#6c584b]">
              <Keyboard className="mb-3 h-5 w-5 text-[#7a4a2e]" />
              `Ctrl/Cmd + Enter` opens checkout for keyboard-first cashiers.
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
