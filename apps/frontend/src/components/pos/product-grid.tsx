import { useDeferredValue, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CartItemAddon, CategoryRecord, MenuProduct, ProductAddonRecord } from "@cafe/shared-types";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/products/ProductImage";
import { apiClient } from "@/services/api-client";
import { usePosStore } from "@/stores/pos-store";

type ProductGridProps = {
  products: MenuProduct[];
  categories: CategoryRecord[];
};

export function ProductGrid({ products, categories }: ProductGridProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const deferredQuery = useDeferredValue(query);
  const addItem = usePosStore((state) => state.addItem);

  const addonsQuery = useQuery({
    queryKey: ["product-addons", selectedProduct?.id],
    queryFn: () => apiClient.productAddons(selectedProduct?.id),
    enabled: Boolean(selectedProduct)
  });

  useEffect(() => {
    setAddonQuantities({});
  }, [selectedProduct?.id]);

  const filtered = products.filter((product) => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 ||
      `${product.name} ${product.category} ${product.sku} ${product.description}`.toLowerCase().includes(normalizedQuery);
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 rounded-[24px] border border-[#eadbcb] bg-white px-4 py-3 shadow-[0_14px_28px_rgba(74,43,24,0.06)]">
        <Search className="h-5 w-5 text-[#9a8170]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-base outline-none placeholder:text-[#a69080]"
          placeholder="Search by product, category, SKU, or barcode"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            selectedCategory === "all"
              ? "bg-[#7a4a2e] text-white shadow-[0_10px_22px_rgba(122,74,46,0.18)]"
              : "border border-[#eadbcb] bg-white text-[#6c584b]"
          }`}
        >
          All items
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelectedCategory(category.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedCategory === category.id
                ? "bg-[#7a4a2e] text-white shadow-[0_10px_22px_rgba(122,74,46,0.18)]"
                : "border border-[#eadbcb] bg-white text-[#6c584b]"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-sm text-[#7b685c]">
            No products found. Try another name, category, SKU, or barcode.
          </Card>
        ) : null}
        {filtered.map((product, index) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -4 }}
            onClick={() => {
              if (product.hasAddons) {
                setSelectedProduct(product);
                return;
              }

              const added = addItem(product);

              if (!added) {
                toast.error(`Only ${product.stockQuantity} ${product.name} available in stock.`);
              }
            }}
            className="h-full min-w-0 text-left disabled:cursor-not-allowed disabled:opacity-60"
            disabled={product.stockQuantity <= 0}
          >
            <Card className="flex h-full min-h-[360px] overflow-hidden border-[#eadbcb] bg-white transition-shadow hover:shadow-[0_20px_38px_rgba(74,43,24,0.11)]">
              <div className="flex min-w-0 flex-1 flex-col">
                <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[4/3] w-full shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7767]">
                      {product.category}
                    </div>
                    <div className="shrink-0 rounded-full bg-[#f3e7d8] px-3 py-1 text-sm font-semibold text-[#7a4a2e]">
                      PHP {product.price.toFixed(2)}
                    </div>
                  </div>
                  <h3 className="line-clamp-2 min-h-[3rem] text-lg font-semibold leading-6 text-[#241610]">{product.name}</h3>
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[#7b685c]">{product.description}</p>
                  {product.hasAddons ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff2e7] px-3 py-1 text-xs font-semibold text-[#7a4a2e]">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Add-ons
                    </div>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-xs font-medium uppercase tracking-[0.16em] text-[#a69080]">{product.sku}</div>
                    <div
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                        product.stockQuantity <= product.lowStockThreshold
                          ? "border-[#e4c8b0] bg-[#fff2e7] text-[#a14f43]"
                          : "border-[#eadbcb] text-[#6c584b]"
                      }`}
                    >
                      Stock {product.stockQuantity}
                    </div>
                  </div>
                  {product.stockQuantity <= product.lowStockThreshold ? (
                    <div className="rounded-2xl bg-[#fff2e7] px-3 py-2 text-xs font-semibold text-[#a14f43]">
                      Low stock threshold: {product.lowStockThreshold}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-xl overflow-auto border-[#eadbcb] bg-white p-6 shadow-[0_30px_70px_rgba(74,43,24,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Add-ons</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#241610]">{selectedProduct.name}</h2>
                <p className="mt-1 text-sm text-[#7b685c]">Choose modifiers for this line item.</p>
              </div>
              <button type="button" className="text-sm font-semibold text-[#7b685c]" onClick={() => setSelectedProduct(null)}>
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {addonsQuery.isLoading ? <div className="text-sm text-[#7b685c]">Loading add-ons...</div> : null}
              {addonsQuery.isError ? <div className="text-sm text-rose-500">{addonsQuery.error.message}</div> : null}
              {(addonsQuery.data ?? []).length === 0 && !addonsQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-4 text-sm text-[#7b685c]">
                  No add-ons selected.
                </div>
              ) : null}
              {(addonsQuery.data ?? []).map((addon: ProductAddonRecord) => {
                const quantity = addonQuantities[addon.id] ?? 0;

                return (
                  <div key={addon.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-[#241610]">{addon.name}</div>
                        <div className="mt-1 text-sm text-[#7b685c]">+ PHP {addon.priceDelta.toFixed(2)}</div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#eadbcb] bg-white px-2 py-1">
                        <button
                          type="button"
                          onClick={() => setAddonQuantities((state) => ({ ...state, [addon.id]: Math.max(quantity - 1, 0) }))}
                          className="rounded-full p-1 text-[#7a4a2e] hover:bg-[#f3e7d8]"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold text-[#241610]">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setAddonQuantities((state) => ({ ...state, [addon.id]: quantity + 1 }))}
                          className="rounded-full p-1 text-[#7a4a2e] hover:bg-[#f3e7d8]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  const addons: CartItemAddon[] = (addonsQuery.data ?? [])
                    .map((addon) => ({
                      addonId: addon.id,
                      name: addon.name,
                      priceDelta: addon.priceDelta,
                      quantity: addonQuantities[addon.id] ?? 0
                    }))
                    .filter((addon) => addon.quantity > 0);

                  const added = addItem(selectedProduct, addons);

                  if (!added) {
                    toast.error(`Only ${selectedProduct.stockQuantity} ${selectedProduct.name} available in stock.`);
                    return;
                  }

                  toast.success(addons.length ? "Added with add-ons." : "Added without add-ons.");
                  setSelectedProduct(null);
                }}
              >
                Add to cart
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSelectedProduct(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
