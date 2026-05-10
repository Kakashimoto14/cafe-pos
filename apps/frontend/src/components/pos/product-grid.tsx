import { useDeferredValue, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { MenuProduct } from "@cafe/shared-types";
import { Card } from "@/components/ui/card";
import { usePosStore } from "@/stores/pos-store";

type ProductGridProps = {
  products: MenuProduct[];
};

export function ProductGrid({ products }: ProductGridProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const addItem = usePosStore((state) => state.addItem);

  const filtered = products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(deferredQuery.toLowerCase())
  );

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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
              <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-cover" />
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
              </div>
            </Card>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
