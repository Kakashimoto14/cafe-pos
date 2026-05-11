import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import type { CategoryRecord, MenuProduct } from "@cafe/shared-types";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/products/ProductImage";
import { usePosStore } from "@/stores/pos-store";

type ProductGridProps = {
  products: MenuProduct[];
  categories: CategoryRecord[];
};

export function ProductGrid({ products, categories }: ProductGridProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);
  const addItem = usePosStore((state) => state.addItem);

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
    </section>
  );
}
