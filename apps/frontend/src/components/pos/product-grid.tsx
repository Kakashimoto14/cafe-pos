import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { CategoryRecord, MenuProduct } from "@cafe/shared-types";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
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
    const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(deferredQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 rounded-[28px] border border-[#eadbcb] bg-white px-4 py-4 shadow-[0_16px_32px_rgba(74,43,24,0.07)]">
        <Search className="h-5 w-5 text-[#9a8170]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-base outline-none placeholder:text-[#a69080]"
          placeholder="Search coffee, pastries, or scan barcode"
        />
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-sm text-[#7b685c]">
            No products match this search or category filter.
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
            className="text-left"
            disabled={product.stockQuantity <= 0}
          >
            <Card className="overflow-hidden border-[#eadbcb] bg-white transition-shadow hover:shadow-[0_24px_48px_rgba(74,43,24,0.12)] disabled:cursor-not-allowed">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="grid h-40 place-items-center bg-[#f8f0e7] text-sm text-[#7b685c]">No image</div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">{product.category}</div>
                    <h3 className="mt-1 text-lg font-semibold text-[#241610]">{product.name}</h3>
                  </div>
                  <div className="rounded-full bg-[#f3e7d8] px-3 py-1 text-sm font-semibold text-[#7a4a2e]">
                    PHP {product.price.toFixed(2)}
                  </div>
                </div>
                <p className="text-sm leading-6 text-[#7b685c]">{product.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#a69080]">
                    {product.stockQuantity <= 0 ? "Sold out" : "Tap to add"}
                  </div>
                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      product.stockQuantity <= product.lowStockThreshold
                        ? "border-[#e4c8b0] bg-[#fff2e7] text-[#a14f43]"
                        : "border-[#eadbcb] text-[#6c584b]"
                    }`}
                  >
                    Stock {product.stockQuantity}
                  </div>
                </div>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
