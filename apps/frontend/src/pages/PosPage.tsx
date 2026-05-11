import { useQuery } from "@tanstack/react-query";
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
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">POS</div>
              <h1 className="mt-2 font-display text-3xl text-[#241610]">Cashier Terminal</h1>
            </div>
            <div className="rounded-[20px] border border-[#d9c2ac] bg-white px-4 py-3 text-[#241610] shadow-[0_14px_28px_rgba(74,43,24,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f7767]">Terminal</div>
              <div className="mt-1 text-xl font-semibold">Counter ready</div>
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
