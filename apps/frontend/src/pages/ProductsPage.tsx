import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layers3, PackagePlus, PencilLine, Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CategoryFormValues, ProductFormValues } from "@cafe/shared-types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaginationControls, PageEmptyState, PageErrorState } from "@/components/ui/page-states";
import { Skeleton } from "@/components/ui/skeleton";
import { appQueryOptions } from "@/lib/app-queries";
import { ProductImage } from "@/components/products/ProductImage";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageCatalog } from "@/utils/roles";
import { Link } from "react-router-dom";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Product name is required."),
  sku: z.string().min(3, "SKU is required."),
  categoryId: z.string().min(1, "Select a category."),
  description: z.string().min(8, "Add a more useful description."),
  price: z.coerce.number().min(1, "Price must be greater than zero."),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative."),
  lowStockThreshold: z.coerce.number().int().min(0, "Threshold cannot be negative."),
  imageUrl: z.union([z.string().url("Use a valid image URL."), z.literal("")]),
  isActive: z.boolean()
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Category name is required."),
  sortOrder: z.coerce.number().int().min(0, "Sort order must be zero or higher."),
  isActive: z.boolean()
});

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

const emptyProduct: ProductFormValues = {
  name: "",
  sku: "",
  categoryId: "",
  description: "",
  price: 0,
  stockQuantity: 0,
  lowStockThreshold: 10,
  imageUrl: "",
  isActive: true
};

const emptyCategory: CategoryFormValues = {
  name: "",
  sortOrder: 0,
  isActive: true
};

export function ProductsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const limit = 12;

  const categoriesQuery = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => apiClient.categories()
  });

  useEffect(() => {
    setPage(1);
  }, [deferredQuery]);

  const productsQuery = useQuery(
    appQueryOptions.products({
      page,
      limit,
      search: deferredQuery.trim() || undefined
    })
  );

  const canEdit = canManageCatalog(user?.role);

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategory
  });

  const saveProductMutation = useMutation({
    mutationFn: (values: ProductFormValues) => apiClient.saveProduct(values),
    onSuccess: () => {
      toast.success("Product saved.");
      setProductEditorOpen(false);
      productForm.reset(emptyProduct);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const toggleProductMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.toggleProduct(id, isActive),
    onSuccess: () => {
      toast.success("Product status updated.");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => apiClient.saveCategory(values),
    onSuccess: () => {
      toast.success("Category saved.");
      setCategoryEditorOpen(false);
      categoryForm.reset(emptyCategory);
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.toggleCategory(id, isActive),
    onSuccess: () => {
      toast.success("Category status updated.");
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => toast.error(error.message)
  });

  useEffect(() => {
    if (!productEditorOpen) {
      productForm.reset(emptyProduct);
    }
  }, [productEditorOpen, productForm]);

  useEffect(() => {
    if (!categoryEditorOpen) {
      categoryForm.reset(emptyCategory);
    }
  }, [categoryEditorOpen, categoryForm]);

  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data?.data ?? [];
  const filteredProducts = useMemo(() => products, [products]);

  if (productsQuery.isLoading && products.length === 0) {
    return (
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-5 shadow-[0_18px_38px_rgba(74,43,24,0.07)]">
          <div className="h-4 w-20 rounded-[18px] bg-[#eadccc]" />
          <div className="mt-4 h-10 w-56 rounded-[18px] bg-[#f0e4d6]" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <Card className="border-[#eadbcb] bg-white p-5">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-3 h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="border-[#eadbcb] bg-white px-4 py-3">
              <Skeleton className="h-10 w-full" />
            </Card>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="overflow-hidden border-[#eadbcb] bg-white">
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (productsQuery.isError) {
    return <PageErrorState title="Products unavailable" message={productsQuery.error.message} onRetry={() => void productsQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-5 shadow-[0_18px_38px_rgba(74,43,24,0.07)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Catalog</div>
            <h1 className="mt-2 font-display text-3xl text-[#241610]">Product Catalog</h1>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  categoryForm.reset(emptyCategory);
                  setCategoryEditorOpen(true);
                }}
              >
                <Layers3 className="mr-2 h-4 w-4" />
                New category
              </Button>
              <Button
                type="button"
                onClick={() => {
                  productForm.reset(emptyProduct);
                  setProductEditorOpen(true);
                }}
              >
                <PackagePlus className="mr-2 h-4 w-4" />
                New product
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="border-[#eadbcb] bg-white p-5 xl:sticky xl:top-28 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Categories</div>
          <div className="mt-4 space-y-3">
            {categoriesQuery.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="mt-3 h-4 w-16" />
                  </div>
                ))
              : null}
            {categoriesQuery.isError ? <div className="text-sm text-rose-500">{categoriesQuery.error.message}</div> : null}
            {categories.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-5 text-sm text-[#7b685c]">
                No categories yet. Add one to organize the live menu.
              </div>
            ) : null}
            {categories.map((category) => (
              <div key={category.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#241610]">{category.name}</div>
                    <div className="mt-1 text-sm text-[#7b685c]">Sort order {category.sortOrder}</div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      category.isActive ? "bg-[#f3e7d8] text-[#7a4a2e]" : "bg-[#efe3d3] text-[#7b685c]"
                    }`}
                  >
                    {category.isActive ? "Visible" : "Hidden"}
                  </div>
                </div>
                {canEdit ? (
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 border border-[#eadbcb] bg-white"
                      onClick={() => {
                        categoryForm.reset({
                          id: category.id,
                          name: category.name,
                          sortOrder: category.sortOrder,
                          isActive: category.isActive
                        });
                        setCategoryEditorOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 border border-[#eadbcb] bg-white"
                      onClick={() => {
                        if (window.confirm(`Update visibility for ${category.name}?`)) {
                          toggleCategoryMutation.mutate({
                            id: category.id,
                            isActive: !category.isActive
                          });
                        }
                      }}
                    >
                      {category.isActive ? "Hide" : "Restore"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="flex items-center gap-3 border-[#eadbcb] bg-white px-4 py-3">
            <Search className="h-5 w-5 text-[#9a8170]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product name, SKU, category, or description"
              className="w-full border-0 bg-transparent p-0 text-sm outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productsQuery.isFetching && products.length > 0 ? <div className="col-span-full text-sm text-[#8f7767]">Refreshing catalog...</div> : null}
          {products.length === 0 ? (
            <div className="col-span-full">
              <PageEmptyState
                title={deferredQuery.trim() ? "No products found" : "No products yet"}
                description={
                  deferredQuery.trim()
                    ? "Try another product name, SKU, or description."
                    : "Add your first menu item to populate the POS screen."
                }
              />
            </div>
          ) : null}

          {filteredProducts.map((product) => (
            <Card key={product.id} className="flex min-h-[430px] flex-col overflow-hidden border-[#eadbcb] bg-white">
              <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[16/10] w-full shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7767]">{product.category}</div>
                  <div className="shrink-0 rounded-full bg-[#f3e7d8] px-3 py-1 text-sm font-semibold text-[#7a4a2e]">
                    {formatMoney(product.price)}
                  </div>
                </div>

                <h2 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-7 text-[#241610]">{product.name}</h2>
                <p className="line-clamp-2 min-h-[3rem] text-sm leading-6 text-[#7b685c]">{product.description}</p>

                <div className="mt-auto flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate rounded-full border border-[#eadbcb] px-3 py-1 font-medium text-[#6c584b]">
                    SKU {product.sku}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 font-semibold ${
                      product.stockQuantity <= product.lowStockThreshold ? "bg-[#fff2e7] text-[#a14f43]" : "bg-[#fffaf4] text-[#6c584b]"
                    }`}
                  >
                    Stock {product.stockQuantity}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${product.hasRecipe ? "bg-[#edf7ed] text-emerald-800" : "bg-[#fff2e7] text-[#a14f43]"}`}>
                    {product.hasRecipe ? "Recipe linked" : "No recipe"}
                  </span>
                  <span className={`rounded-full px-3 py-1 ${product.hasAddons ? "bg-[#f3e7d8] text-[#7a4a2e]" : "bg-[#fffaf4] text-[#7b685c]"}`}>
                    {product.hasAddons ? "Add-ons available" : "No add-ons"}
                  </span>
                </div>
                {product.stockQuantity <= product.lowStockThreshold ? (
                  <div className="rounded-2xl bg-[#fff2e7] px-3 py-2 text-xs font-semibold text-[#a14f43]">
                    Low stock threshold: {product.lowStockThreshold}
                  </div>
                ) : null}

                {canEdit ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 border border-[#eadbcb] bg-white"
                      onClick={() => {
                        productForm.reset({
                          id: product.id,
                          name: product.name,
                          sku: product.sku,
                          categoryId: product.categoryId,
                          description: product.description,
                          price: product.price,
                          stockQuantity: product.stockQuantity,
                          lowStockThreshold: product.lowStockThreshold,
                          imageUrl: product.imageUrl ?? "",
                          isActive: product.isActive
                        });
                        setProductEditorOpen(true);
                      }}
                    >
                      <PencilLine className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 border border-[#eadbcb] bg-white"
                      onClick={() => {
                        if (window.confirm(`Update visibility for ${product.name}?`)) {
                          toggleProductMutation.mutate({
                            id: product.id,
                            isActive: !product.isActive
                          });
                        }
                      }}
                    >
                      {product.isActive ? "Archive" : "Restore"}
                    </Button>
                  </div>
                ) : null}
                {canEdit ? (
                  <Link to="/inventory" className="text-sm font-semibold text-[#7a4a2e] hover:text-[#5b341f]">
                    Manage recipe in Inventory
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
          </div>

          <PaginationControls
            page={productsQuery.data?.meta.page ?? page}
            totalPages={productsQuery.data?.meta.totalPages ?? 0}
            label={productsQuery.data ? `${productsQuery.data.meta.total} total products` : undefined}
            onPageChange={setPage}
          />
        </div>
      </section>

      {productEditorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto border-[#eadbcb] bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Catalog editor</div>
                <h2 className="mt-2 text-3xl font-semibold text-[#241610]">
                  {productForm.getValues("id") ? "Update product" : "Create product"}
                </h2>
              </div>
              <button type="button" className="text-sm font-medium text-[#7b685c]" onClick={() => setProductEditorOpen(false)}>
                Close
              </button>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={productForm.handleSubmit((values) => saveProductMutation.mutate(values))}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Product name</span>
                <input {...productForm.register("name")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {productForm.formState.errors.name ? <p className="text-sm text-rose-500">{productForm.formState.errors.name.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">SKU</span>
                <input {...productForm.register("sku")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {productForm.formState.errors.sku ? <p className="text-sm text-rose-500">{productForm.formState.errors.sku.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Category</span>
                <select {...productForm.register("categoryId")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {productForm.formState.errors.categoryId ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.categoryId.message}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Image URL</span>
                <input {...productForm.register("imageUrl")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {productForm.formState.errors.imageUrl ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.imageUrl.message}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Price</span>
                <input type="number" step="0.01" {...productForm.register("price")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {productForm.formState.errors.price ? <p className="text-sm text-rose-500">{productForm.formState.errors.price.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Stock quantity</span>
                <input type="number" {...productForm.register("stockQuantity")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {productForm.formState.errors.stockQuantity ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.stockQuantity.message}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Low-stock threshold</span>
                <input type="number" {...productForm.register("lowStockThreshold")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {productForm.formState.errors.lowStockThreshold ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.lowStockThreshold.message}</p>
                ) : null}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[#5f4637]">Description</span>
                <textarea {...productForm.register("description")} rows={4} className="w-full rounded-2xl bg-[#fffdf9] px-4 py-3" />
                {productForm.formState.errors.description ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.description.message}</p>
                ) : null}
              </label>

              <label className="flex items-center gap-3 md:col-span-2">
                <input type="checkbox" {...productForm.register("isActive")} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm text-[#5f4637]">Show this product on the live POS screen</span>
              </label>

              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saveProductMutation.isPending}>
                  {saveProductMutation.isPending ? "Saving..." : "Save product"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setProductEditorOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {categoryEditorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="w-full max-w-xl border-[#eadbcb] bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Menu grouping</div>
                <h2 className="mt-2 text-3xl font-semibold text-[#241610]">
                  {categoryForm.getValues("id") ? "Update category" : "Create category"}
                </h2>
              </div>
              <button type="button" className="text-sm font-medium text-[#7b685c]" onClick={() => setCategoryEditorOpen(false)}>
                Close
              </button>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={categoryForm.handleSubmit((values) => saveCategoryMutation.mutate(values))}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Category name</span>
                <input {...categoryForm.register("name")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {categoryForm.formState.errors.name ? <p className="text-sm text-rose-500">{categoryForm.formState.errors.name.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Sort order</span>
                <input type="number" {...categoryForm.register("sortOrder")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {categoryForm.formState.errors.sortOrder ? (
                  <p className="text-sm text-rose-500">{categoryForm.formState.errors.sortOrder.message}</p>
                ) : null}
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" {...categoryForm.register("isActive")} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm text-[#5f4637]">Show this category to cashiers</span>
              </label>

              <div className="flex gap-3">
                <Button type="submit" disabled={saveCategoryMutation.isPending}>
                  {saveCategoryMutation.isPending ? "Saving..." : "Save category"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCategoryEditorOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
