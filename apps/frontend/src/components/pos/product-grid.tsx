import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { CategoryRecord, MenuProduct } from "@cafe/shared-types";
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
      <div className="flex items-center gap-3 rounded-[28px] border border-white/60 bg-white/80 px-4 py-3 shadow-panel">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-slate-400"
          placeholder="Search menu or scan barcode"
        />
      </div>
      <div className="flex gap-2 overflow-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            selectedCategory === "all" ? "bg-slate-950 text-white" : "bg-white/80 text-slate-600"
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
              selectedCategory === category.id ? "bg-slate-950 text-white" : "bg-white/80 text-slate-600"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.length === 0 ? (
          <Card className="col-span-full p-6 text-sm text-slate-500">
            No products match this search or category filter.
          </Card>
        ) : null}
        {filtered.map((product, index) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={() => addItem(product)}
            className="text-left"
          >
            <Card className="overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="grid h-40 place-items-center bg-slate-100 text-sm text-slate-500">No image</div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {product.category}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">{product.name}</h3>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    PHP {product.price.toFixed(2)}
                  </div>
                </div>
                <p className="text-sm text-slate-500">{product.description}</p>
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Stock {product.stockQuantity}
                </div>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
