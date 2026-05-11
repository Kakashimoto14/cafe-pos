import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, History, PackagePlus, Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Select a product."),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, "Adjustment cannot be zero."),
  adjustmentType: z.enum(["stock_in", "stock_out", "manual", "waste"]),
  reason: z.string().min(3, "Add a reason for the adjustment.")
});

type AdjustmentValues = z.infer<typeof adjustmentSchema>;

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const productsQuery = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => apiClient.products()
  });

  const adjustmentsQuery = useQuery({
    queryKey: ["inventory-adjustments"],
    queryFn: () => apiClient.inventoryAdjustments()
  });

  const adjustmentForm = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: "",
      quantityDelta: 1,
      adjustmentType: "stock_in",
      reason: ""
    }
  });

  const adjustmentMutation = useMutation({
    mutationFn: (values: AdjustmentValues) =>
      apiClient.adjustInventory({
        productId: values.productId,
        quantityDelta: values.adjustmentType === "stock_out" || values.adjustmentType === "waste" ? values.quantityDelta * -1 : values.quantityDelta,
        reason: values.reason,
        adjustmentType: values.adjustmentType
      }),
    onSuccess: () => {
      toast.success("Inventory updated.");
      adjustmentForm.reset({
        productId: "",
        quantityDelta: 1,
        adjustmentType: "stock_in",
        reason: ""
      });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const products = productsQuery.data ?? [];
  const adjustments = adjustmentsQuery.data ?? [];
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter((product) =>
      `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  const lowStockCount = products.filter((product) => product.stockQuantity <= product.lowStockThreshold).length;
  const totalUnits = products.reduce((sum, product) => sum + product.stockQuantity, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Inventory</div>
            <h1 className="mt-3 font-display text-4xl text-[#241610]">Inventory</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Tracked products</div>
              <div className="mt-2 text-2xl font-semibold text-[#241610]">{products.length}</div>
            </Card>
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Units on hand</div>
              <div className="mt-2 text-2xl font-semibold text-[#241610]">{totalUnits}</div>
            </Card>
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Low stock</div>
              <div className="mt-2 text-2xl font-semibold text-[#a36d40]">{lowStockCount}</div>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Adjust stock</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">New movement</h2>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={adjustmentForm.handleSubmit((values) => adjustmentMutation.mutate(values))}>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#5f4637]">Product</span>
              <select {...adjustmentForm.register("productId")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                <option value="">Choose a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.stockQuantity} on hand)
                  </option>
                ))}
              </select>
              {adjustmentForm.formState.errors.productId ? (
                <p className="text-sm text-rose-500">{adjustmentForm.formState.errors.productId.message}</p>
              ) : null}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Movement type</span>
                <select {...adjustmentForm.register("adjustmentType")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                  <option value="stock_in">Stock in</option>
                  <option value="stock_out">Stock out</option>
                  <option value="manual">Manual correction</option>
                  <option value="waste">Waste</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Quantity</span>
                <input type="number" {...adjustmentForm.register("quantityDelta")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {adjustmentForm.formState.errors.quantityDelta ? (
                  <p className="text-sm text-rose-500">{adjustmentForm.formState.errors.quantityDelta.message}</p>
                ) : null}
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[#5f4637]">Reason</span>
              <textarea {...adjustmentForm.register("reason")} rows={4} className="w-full rounded-2xl bg-[#fffdf9] px-4 py-3" />
              {adjustmentForm.formState.errors.reason ? (
                <p className="text-sm text-rose-500">{adjustmentForm.formState.errors.reason.message}</p>
              ) : null}
            </label>

            <Button type="submit" disabled={adjustmentMutation.isPending}>
              {adjustmentMutation.isPending ? "Saving..." : "Save adjustment"}
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="border-[#eadbcb] bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Stock list</div>
                <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Current product counts</h2>
              </div>
              <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-[#eadbcb] bg-[#fffdf9] px-4 md:max-w-sm">
                <Search className="h-4 w-4 text-[#9a8170]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search product, SKU, or category"
                  className="w-full border-0 bg-transparent p-0 text-sm outline-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {productsQuery.isLoading ? <div className="text-sm text-[#7b685c]">Loading stock levels...</div> : null}
              {productsQuery.isError ? <div className="text-sm text-rose-500">{productsQuery.error.message}</div> : null}
              {filteredProducts.map((product) => (
                <div key={product.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-[#241610]">{product.name}</div>
                      <div className="mt-1 text-sm text-[#7b685c]">
                        {product.category} / {product.sku}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#eadbcb] px-3 py-1 text-sm font-medium text-[#6c584b]">
                        Stock {product.stockQuantity}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          product.stockQuantity <= product.lowStockThreshold
                            ? "bg-[#f7e4d6] text-[#a14f43]"
                            : "bg-[#f3e7d8] text-[#7a4a2e]"
                        }`}
                      >
                        Threshold {product.lowStockThreshold}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {!productsQuery.isLoading && filteredProducts.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                  No products match this inventory search.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Movement history</div>
                <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Recent adjustments</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {adjustmentsQuery.isLoading ? <div className="text-sm text-[#7b685c]">Loading history...</div> : null}
              {adjustmentsQuery.isError ? <div className="text-sm text-rose-500">{adjustmentsQuery.error.message}</div> : null}
              {adjustments.map((adjustment) => (
                <div key={adjustment.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-[#241610]">{adjustment.productName}</div>
                      <div className="mt-1 text-sm text-[#7b685c]">
                        {adjustment.userName} / {new Date(adjustment.createdAt).toLocaleString("en-PH")}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-[#f3e7d8] px-3 py-1 font-medium text-[#7a4a2e]">
                        {adjustment.adjustmentType.replace("_", " ")}
                      </span>
                      <span className={`font-semibold ${adjustment.quantityDelta > 0 ? "text-emerald-700" : "text-[#a14f43]"}`}>
                        {adjustment.quantityDelta > 0 ? "+" : ""}
                        {adjustment.quantityDelta}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#7b685c]">
                    <span>
                      {adjustment.previousQuantity} to {adjustment.newQuantity}
                    </span>
                    {adjustment.reason ? <span>{adjustment.reason}</span> : null}
                    {adjustment.referenceOrderId ? (
                      <span className="inline-flex items-center gap-1 text-[#a36d40]">
                        <AlertTriangle className="h-4 w-4" />
                        Linked to sale
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
              {!adjustmentsQuery.isLoading && adjustments.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                  No inventory movement has been recorded yet.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
