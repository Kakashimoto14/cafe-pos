import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layers3, PackagePlus, PencilLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { CategoryFormValues, ProductFormValues } from "@cafe/shared-types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageCatalog } from "@/utils/roles";

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Product name is required."),
  sku: z.string().min(3, "SKU is required."),
  categoryId: z.string().min(1, "Select a category."),
  description: z.string().min(8, "Add a more useful description."),
  price: z.coerce.number().min(1, "Price must be greater than zero."),
  stockQuantity: z.coerce.number().int().min(0, "Stock cannot be negative."),
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
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => apiClient.categories()
  });

  const productsQuery = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => apiClient.products()
  });

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
  const products = productsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Catalog control</div>
          <h1 className="mt-3 font-display text-4xl text-slate-950">Products and categories</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            This workspace feeds the live POS grid, order flow, and revenue reporting.
          </p>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="ghost"
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
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Categories</div>
          <div className="mt-4 space-y-3">
            {categoriesQuery.isLoading ? <div className="text-sm text-slate-500">Loading categories...</div> : null}
            {categoriesQuery.isError ? <div className="text-sm text-rose-500">{categoriesQuery.error.message}</div> : null}
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-white/60 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{category.name}</div>
                    <div className="mt-1 text-sm text-slate-500">Sort order {category.sortOrder}</div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {category.isActive ? "Active" : "Hidden"}
                  </div>
                </div>
                {canEdit ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-panel"
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
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-panel"
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
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productsQuery.isLoading ? <Card className="p-6 text-sm text-slate-500">Loading products...</Card> : null}
          {productsQuery.isError ? <Card className="p-6 text-sm text-rose-500">{productsQuery.error.message}</Card> : null}

          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="h-44 w-full object-cover" />
              ) : (
                <div className="grid h-44 place-items-center bg-slate-100 text-sm text-slate-500">No product image</div>
              )}
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{product.category}</div>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">{product.name}</h2>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                    {formatMoney(product.price)}
                  </div>
                </div>

                <p className="text-sm text-slate-500">{product.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">SKU {product.sku}</span>
                  <span className={product.stockQuantity <= 20 ? "font-semibold text-amber-700" : "text-slate-600"}>
                    Stock {product.stockQuantity}
                  </span>
                </div>

                {canEdit ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        productForm.reset({
                          id: product.id,
                          name: product.name,
                          sku: product.sku,
                          categoryId: product.categoryId,
                          description: product.description,
                          price: product.price,
                          stockQuantity: product.stockQuantity,
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
                      className="flex-1"
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
              </div>
            </Card>
          ))}
        </div>
      </section>

      {productEditorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog editor</div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  {productForm.getValues("id") ? "Update product" : "Create product"}
                </h2>
              </div>
              <button type="button" className="text-sm font-medium text-slate-500" onClick={() => setProductEditorOpen(false)}>
                Close
              </button>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={productForm.handleSubmit((values) => saveProductMutation.mutate(values))}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Product name</span>
                <input {...productForm.register("name")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {productForm.formState.errors.name ? <p className="text-sm text-rose-500">{productForm.formState.errors.name.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">SKU</span>
                <input {...productForm.register("sku")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {productForm.formState.errors.sku ? <p className="text-sm text-rose-500">{productForm.formState.errors.sku.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Category</span>
                <select {...productForm.register("categoryId")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none">
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
                <span className="text-sm font-medium text-slate-700">Image URL</span>
                <input {...productForm.register("imageUrl")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {productForm.formState.errors.imageUrl ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.imageUrl.message}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Price</span>
                <input type="number" step="0.01" {...productForm.register("price")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {productForm.formState.errors.price ? <p className="text-sm text-rose-500">{productForm.formState.errors.price.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Stock quantity</span>
                <input type="number" {...productForm.register("stockQuantity")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {productForm.formState.errors.stockQuantity ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.stockQuantity.message}</p>
                ) : null}
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea {...productForm.register("description")} rows={4} className="w-full rounded-2xl border border-white/60 bg-slate-50 px-4 py-3 outline-none" />
                {productForm.formState.errors.description ? (
                  <p className="text-sm text-rose-500">{productForm.formState.errors.description.message}</p>
                ) : null}
              </label>

              <label className="flex items-center gap-3 md:col-span-2">
                <input type="checkbox" {...productForm.register("isActive")} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Show this product on the live POS screen</span>
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <Card className="w-full max-w-xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Menu grouping</div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  {categoryForm.getValues("id") ? "Update category" : "Create category"}
                </h2>
              </div>
              <button type="button" className="text-sm font-medium text-slate-500" onClick={() => setCategoryEditorOpen(false)}>
                Close
              </button>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={categoryForm.handleSubmit((values) => saveCategoryMutation.mutate(values))}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Category name</span>
                <input {...categoryForm.register("name")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {categoryForm.formState.errors.name ? <p className="text-sm text-rose-500">{categoryForm.formState.errors.name.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Sort order</span>
                <input type="number" {...categoryForm.register("sortOrder")} className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none" />
                {categoryForm.formState.errors.sortOrder ? (
                  <p className="text-sm text-rose-500">{categoryForm.formState.errors.sortOrder.message}</p>
                ) : null}
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" {...categoryForm.register("isActive")} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm text-slate-700">Show this category to cashiers</span>
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
