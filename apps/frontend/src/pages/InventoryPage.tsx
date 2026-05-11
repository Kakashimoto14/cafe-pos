import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Beaker, History, PackagePlus, Search, SlidersHorizontal, X } from "lucide-react";
import type { IngredientAdjustmentType, IngredientFormValues, ProductAddonFormValues } from "@cafe/shared-types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageInventory } from "@/utils/roles";

type InventoryTab = "ingredients" | "movement" | "recipes" | "addons";

const emptyIngredient: IngredientFormValues = {
  sku: "",
  name: "",
  category: "",
  unit: "",
  quantityOnHand: 0,
  lowStockThreshold: 0,
  costPerUnit: 0,
  supplier: "",
  isActive: true
};

const emptyAddon: ProductAddonFormValues = {
  name: "",
  sku: "",
  description: "",
  priceDelta: 0,
  isActive: true
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

function numberValue(value: string) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canEdit = canManageInventory(user?.role);
  const [activeTab, setActiveTab] = useState<InventoryTab>("ingredients");
  const [query, setQuery] = useState("");
  const [ingredientEditorOpen, setIngredientEditorOpen] = useState(false);
  const [addonEditorOpen, setAddonEditorOpen] = useState(false);
  const [ingredientForm, setIngredientForm] = useState<IngredientFormValues>(emptyIngredient);
  const [addonForm, setAddonForm] = useState<ProductAddonFormValues>(emptyAddon);
  const [movementForm, setMovementForm] = useState<{
    ingredientId: string;
    adjustmentType: Exclude<IngredientAdjustmentType, "sale">;
    quantity: number;
    reason: string;
  }>({
    ingredientId: "",
    adjustmentType: "stock_in",
    quantity: 1,
    reason: ""
  });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedRecipeIngredientId, setSelectedRecipeIngredientId] = useState("");
  const [recipeQuantity, setRecipeQuantity] = useState(1);
  const [selectedAddonId, setSelectedAddonId] = useState("");
  const [selectedAddonIngredientId, setSelectedAddonIngredientId] = useState("");
  const [addonIngredientQuantity, setAddonIngredientQuantity] = useState(1);
  const [linkAddonId, setLinkAddonId] = useState("");

  const ingredientsQuery = useQuery({
    queryKey: ["ingredients", "all"],
    queryFn: () => apiClient.ingredients()
  });

  const productsQuery = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => apiClient.products()
  });

  const movementsQuery = useQuery({
    queryKey: ["ingredient-adjustments"],
    queryFn: () => apiClient.ingredientAdjustments()
  });

  const addonsQuery = useQuery({
    queryKey: ["product-addons", "all"],
    queryFn: () => apiClient.productAddons()
  });

  const recipeQuery = useQuery({
    queryKey: ["product-ingredients", selectedProductId],
    queryFn: () => apiClient.productIngredients(selectedProductId),
    enabled: Boolean(selectedProductId)
  });

  const addonIngredientsQuery = useQuery({
    queryKey: ["addon-ingredients", selectedAddonId],
    queryFn: () => apiClient.addonIngredients(selectedAddonId),
    enabled: Boolean(selectedAddonId)
  });

  const addonLinksQuery = useQuery({
    queryKey: ["product-addon-links", selectedProductId],
    queryFn: () => apiClient.productAddonLinks(selectedProductId),
    enabled: Boolean(selectedProductId)
  });

  const ingredients = ingredientsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const addons = addonsQuery.data ?? [];
  const recipeRows = recipeQuery.data ?? [];
  const addonIngredientRows = addonIngredientsQuery.data ?? [];
  const addonLinkRows = addonLinksQuery.data ?? [];

  const filteredIngredients = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return ingredients;
    }

    return ingredients.filter((ingredient) =>
      `${ingredient.name} ${ingredient.sku} ${ingredient.category} ${ingredient.supplier ?? ""}`.toLowerCase().includes(normalized)
    );
  }, [ingredients, query]);

  const lowStockIngredients = ingredients.filter(
    (ingredient) => ingredient.isActive && ingredient.quantityOnHand <= ingredient.lowStockThreshold
  );
  const totalIngredientUnits = ingredients.reduce((sum, ingredient) => sum + ingredient.quantityOnHand, 0);
  const productsWithRecipes = products.filter((product) => product.hasRecipe).length;

  const invalidateInventory = () => {
    void queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    void queryClient.invalidateQueries({ queryKey: ["ingredient-adjustments"] });
    void queryClient.invalidateQueries({ queryKey: ["product-ingredients"] });
    void queryClient.invalidateQueries({ queryKey: ["product-addons"] });
    void queryClient.invalidateQueries({ queryKey: ["addon-ingredients"] });
    void queryClient.invalidateQueries({ queryKey: ["product-addon-links"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveIngredientMutation = useMutation({
    mutationFn: (values: IngredientFormValues) => apiClient.saveIngredient(values),
    onSuccess: () => {
      toast.success("Ingredient saved.");
      setIngredientEditorOpen(false);
      setIngredientForm(emptyIngredient);
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const toggleIngredientMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.toggleIngredient(id, isActive),
    onSuccess: () => {
      toast.success("Ingredient status updated.");
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const adjustIngredientMutation = useMutation({
    mutationFn: () =>
      apiClient.adjustIngredient({
        ingredientId: movementForm.ingredientId,
        quantityDelta:
          movementForm.adjustmentType === "stock_out" || movementForm.adjustmentType === "waste"
            ? movementForm.quantity * -1
            : movementForm.quantity,
        reason: movementForm.reason,
        adjustmentType: movementForm.adjustmentType
      }),
    onSuccess: () => {
      toast.success("Ingredient movement saved.");
      setMovementForm({ ingredientId: "", adjustmentType: "stock_in", quantity: 1, reason: "" });
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const saveRecipeMutation = useMutation({
    mutationFn: () =>
      apiClient.saveProductIngredient({
        productId: selectedProductId,
        ingredientId: selectedRecipeIngredientId,
        quantityRequired: recipeQuantity
      }),
    onSuccess: () => {
      toast.success("Recipe ingredient saved.");
      setSelectedRecipeIngredientId("");
      setRecipeQuantity(1);
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteProductIngredient(id),
    onSuccess: () => {
      toast.success("Recipe ingredient removed.");
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const saveAddonMutation = useMutation({
    mutationFn: (values: ProductAddonFormValues) => apiClient.saveAddon(values),
    onSuccess: () => {
      toast.success("Add-on saved.");
      setAddonEditorOpen(false);
      setAddonForm(emptyAddon);
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const toggleAddonMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.toggleAddon(id, isActive),
    onSuccess: () => {
      toast.success("Add-on status updated.");
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const saveAddonIngredientMutation = useMutation({
    mutationFn: () =>
      apiClient.saveAddonIngredient({
        addonId: selectedAddonId,
        ingredientId: selectedAddonIngredientId,
        quantityRequired: addonIngredientQuantity
      }),
    onSuccess: () => {
      toast.success("Add-on ingredient saved.");
      setSelectedAddonIngredientId("");
      setAddonIngredientQuantity(1);
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteAddonIngredientMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteAddonIngredient(id),
    onSuccess: () => {
      toast.success("Add-on ingredient removed.");
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const saveProductAddonLinkMutation = useMutation({
    mutationFn: () => apiClient.saveProductAddonLink({ productId: selectedProductId, addonId: linkAddonId }),
    onSuccess: () => {
      toast.success("Add-on linked to product.");
      setLinkAddonId("");
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const deleteProductAddonLinkMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteProductAddonLink(id),
    onSuccess: () => {
      toast.success("Add-on link removed.");
      invalidateInventory();
    },
    onError: (error) => toast.error(error.message)
  });

  const tabs: Array<{ value: InventoryTab; label: string }> = [
    { value: "ingredients", label: "Ingredients" },
    { value: "movement", label: "Stock Movement" },
    { value: "recipes", label: "Recipes" },
    { value: "addons", label: "Add-ons" }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Inventory</div>
            <h1 className="mt-3 font-display text-4xl text-[#241610]">Ingredient Inventory</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Tracked ingredients</div>
              <div className="mt-2 text-2xl font-semibold text-[#241610]">{ingredients.length}</div>
            </Card>
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Total units/items</div>
              <div className="mt-2 text-2xl font-semibold text-[#241610]">{totalIngredientUnits.toFixed(1)}</div>
            </Card>
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Low stock ingredients</div>
              <div className="mt-2 text-2xl font-semibold text-[#a36d40]">{lowStockIngredients.length}</div>
            </Card>
            <Card className="border-[#eadbcb] bg-white px-4 py-4">
              <div className="text-sm text-[#7b685c]">Products with recipes</div>
              <div className="mt-2 text-2xl font-semibold text-[#241610]">{productsWithRecipes}</div>
            </Card>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-auto rounded-[24px] border border-[#eadbcb] bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.value ? "bg-[#7a4a2e] text-white shadow-sm" : "text-[#6c584b] hover:bg-[#f6eee5]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ingredients" ? (
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Ingredients</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Raw stock</h2>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex h-12 w-full items-center gap-3 rounded-2xl border border-[#eadbcb] bg-[#fffdf9] px-4 md:w-80">
                <Search className="h-4 w-4 text-[#9a8170]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, SKU, supplier"
                  className="w-full border-0 bg-transparent p-0 text-sm outline-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  onClick={() => {
                    setIngredientForm(emptyIngredient);
                    setIngredientEditorOpen(true);
                  }}
                >
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Add ingredient
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {ingredientsQuery.isLoading ? <div className="text-sm text-[#7b685c]">Loading ingredients...</div> : null}
            {ingredientsQuery.isError ? <div className="text-sm text-rose-500">{ingredientsQuery.error.message}</div> : null}
            {filteredIngredients.map((ingredient) => {
              const status = !ingredient.isActive ? "Inactive" : ingredient.quantityOnHand <= ingredient.lowStockThreshold ? "Low stock" : "Healthy";

              return (
                <div key={ingredient.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-[#241610]">{ingredient.name}</div>
                      <div className="mt-1 text-sm text-[#7b685c]">
                        {ingredient.category} / {ingredient.sku}
                        {ingredient.supplier ? ` / ${ingredient.supplier}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-[#eadbcb] bg-white px-3 py-1 font-medium text-[#6c584b]">
                        {ingredient.quantityOnHand} {ingredient.unit}
                      </span>
                      <span className="rounded-full bg-[#f3e7d8] px-3 py-1 font-medium text-[#7a4a2e]">
                        Threshold {ingredient.lowStockThreshold}
                      </span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${status === "Low stock" ? "bg-[#fff2e7] text-[#a14f43]" : "bg-white text-[#6c584b]"}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  {canEdit ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="border border-[#eadbcb] bg-white"
                        onClick={() => {
                          setIngredientForm({
                            id: ingredient.id,
                            sku: ingredient.sku,
                            name: ingredient.name,
                            category: ingredient.category,
                            unit: ingredient.unit,
                            quantityOnHand: ingredient.quantityOnHand,
                            lowStockThreshold: ingredient.lowStockThreshold,
                            costPerUnit: ingredient.costPerUnit,
                            supplier: ingredient.supplier ?? "",
                            isActive: ingredient.isActive
                          });
                          setIngredientEditorOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="border border-[#eadbcb] bg-white"
                        onClick={() => toggleIngredientMutation.mutate({ id: ingredient.id, isActive: !ingredient.isActive })}
                      >
                        {ingredient.isActive ? "Archive" : "Restore"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {activeTab === "movement" ? (
        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Card className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                <Beaker className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Adjust ingredient</div>
                <h2 className="mt-1 text-2xl font-semibold text-[#241610]">New movement</h2>
              </div>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();

                if (!movementForm.ingredientId || movementForm.quantity <= 0 || movementForm.reason.trim().length < 3) {
                  toast.error("Choose an ingredient, quantity, and reason.");
                  return;
                }

                adjustIngredientMutation.mutate();
              }}
            >
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Ingredient</span>
                <select
                  value={movementForm.ingredientId}
                  onChange={(event) => setMovementForm((state) => ({ ...state, ingredientId: event.target.value }))}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                  disabled={!canEdit}
                >
                  <option value="">Choose an ingredient</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.quantityOnHand} {ingredient.unit})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#5f4637]">Movement type</span>
                  <select
                    value={movementForm.adjustmentType}
                    onChange={(event) => setMovementForm((state) => ({ ...state, adjustmentType: event.target.value as typeof movementForm.adjustmentType }))}
                    className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                    disabled={!canEdit}
                  >
                    <option value="stock_in">Stock in</option>
                    <option value="stock_out">Stock out</option>
                    <option value="manual">Manual correction</option>
                    <option value="waste">Waste</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#5f4637]">Quantity</span>
                  <input
                    type="number"
                    step="0.001"
                    value={movementForm.quantity}
                    onChange={(event) => setMovementForm((state) => ({ ...state, quantity: numberValue(event.target.value) }))}
                    className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                    disabled={!canEdit}
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Reason</span>
                <textarea
                  value={movementForm.reason}
                  onChange={(event) => setMovementForm((state) => ({ ...state, reason: event.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl bg-[#fffdf9] px-4 py-3"
                  disabled={!canEdit}
                />
              </label>
              <Button type="submit" disabled={!canEdit || adjustIngredientMutation.isPending}>
                {adjustIngredientMutation.isPending ? "Saving..." : "Save movement"}
              </Button>
            </form>
          </Card>

          <Card className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Movement history</div>
                <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Recent ingredient adjustments</h2>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {movementsQuery.isLoading ? <div className="text-sm text-[#7b685c]">Loading history...</div> : null}
              {movementsQuery.isError ? <div className="text-sm text-rose-500">{movementsQuery.error.message}</div> : null}
              {(movementsQuery.data ?? []).map((movement) => (
                <div key={movement.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-[#241610]">{movement.ingredientName}</div>
                      <div className="mt-1 text-sm text-[#7b685c]">
                        {movement.userName} / {new Date(movement.createdAt).toLocaleString("en-PH")}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-[#f3e7d8] px-3 py-1 font-medium text-[#7a4a2e]">
                        {movement.adjustmentType.replace("_", " ")}
                      </span>
                      <span className={`font-semibold ${movement.quantityDelta > 0 ? "text-emerald-700" : "text-[#a14f43]"}`}>
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta} {movement.ingredientUnit}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#7b685c]">
                    <span>
                      {movement.previousQuantity} to {movement.newQuantity}
                    </span>
                    {movement.reason ? <span>{movement.reason}</span> : null}
                    {movement.referenceOrderId ? (
                      <span className="inline-flex items-center gap-1 text-[#a36d40]">
                        <AlertTriangle className="h-4 w-4" />
                        Linked sale
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {activeTab === "recipes" ? (
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Recipes</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Product bill of materials</h2>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="mt-5 h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
              >
                <option value="">Choose a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {selectedProductId && canEdit ? (
                <div className="mt-4 space-y-3 rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <select
                    value={selectedRecipeIngredientId}
                    onChange={(event) => setSelectedRecipeIngredientId(event.target.value)}
                    className="h-12 w-full rounded-2xl bg-white px-4"
                  >
                    <option value="">Ingredient</option>
                    {ingredients.filter((ingredient) => ingredient.isActive).map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.001"
                    value={recipeQuantity}
                    onChange={(event) => setRecipeQuantity(numberValue(event.target.value))}
                    className="h-12 w-full rounded-2xl bg-white px-4"
                    placeholder="Quantity required"
                  />
                  <Button
                    type="button"
                    disabled={!selectedRecipeIngredientId || recipeQuantity <= 0 || saveRecipeMutation.isPending}
                    onClick={() => saveRecipeMutation.mutate()}
                  >
                    Add ingredient to recipe
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              {!selectedProductId ? (
                <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                  Select a product to manage its recipe.
                </div>
              ) : recipeRows.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                  No recipe yet. Add ingredients so sales can deduct stock automatically.
                </div>
              ) : (
                recipeRows.map((row) => (
                  <div key={row.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-semibold text-[#241610]">{row.ingredientName}</div>
                        <div className="mt-1 text-sm text-[#7b685c]">
                          {row.quantityRequired} {row.ingredientUnit} / cost {formatMoney(row.quantityRequired * row.costPerUnit)}
                        </div>
                      </div>
                      {canEdit ? (
                        <Button type="button" variant="ghost" className="border border-[#eadbcb] bg-white" onClick={() => deleteRecipeMutation.mutate(row.id)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "addons" ? (
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Add-ons</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Modifiers and ingredient usage</h2>
            </div>
            {canEdit ? (
              <Button
                type="button"
                onClick={() => {
                  setAddonForm(emptyAddon);
                  setAddonEditorOpen(true);
                }}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Add add-on
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-3">
              {addons.map((addon) => {
                const isSelected = addon.id === selectedAddonId;

                return (
                  <div key={addon.id} className={`rounded-[24px] border p-4 ${isSelected ? "border-[#cba57f] bg-white" : "border-[#f0e4d6] bg-[#fffaf4]"}`}>
                    <button type="button" className="w-full text-left" onClick={() => setSelectedAddonId(addon.id)}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-[#241610]">{addon.name}</div>
                          <div className="mt-1 text-sm text-[#7b685c]">
                            {addon.sku} / + {formatMoney(addon.priceDelta)}
                          </div>
                        </div>
                        <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${addon.isActive ? "bg-[#f3e7d8] text-[#7a4a2e]" : "bg-[#efe3d3] text-[#7b685c]"}`}>
                          {addon.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </button>
                    {canEdit ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="border border-[#eadbcb] bg-white"
                          onClick={() => {
                            setAddonForm({
                              id: addon.id,
                              name: addon.name,
                              sku: addon.sku,
                              description: addon.description ?? "",
                              priceDelta: addon.priceDelta,
                              isActive: addon.isActive
                            });
                            setAddonEditorOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="border border-[#eadbcb] bg-white"
                          onClick={() => toggleAddonMutation.mutate({ id: addon.id, isActive: !addon.isActive })}
                        >
                          {addon.isActive ? "Archive" : "Restore"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                <div className="font-semibold text-[#241610]">Add-on ingredients</div>
                <select value={selectedAddonId} onChange={(event) => setSelectedAddonId(event.target.value)} className="mt-3 h-12 w-full rounded-2xl bg-white px-4">
                  <option value="">Choose add-on</option>
                  {addons.map((addon) => (
                    <option key={addon.id} value={addon.id}>
                      {addon.name}
                    </option>
                  ))}
                </select>
                {selectedAddonId && canEdit ? (
                  <div className="mt-3 grid gap-3">
                    <select
                      value={selectedAddonIngredientId}
                      onChange={(event) => setSelectedAddonIngredientId(event.target.value)}
                      className="h-12 w-full rounded-2xl bg-white px-4"
                    >
                      <option value="">Ingredient</option>
                      {ingredients.filter((ingredient) => ingredient.isActive).map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({ingredient.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      value={addonIngredientQuantity}
                      onChange={(event) => setAddonIngredientQuantity(numberValue(event.target.value))}
                      className="h-12 w-full rounded-2xl bg-white px-4"
                    />
                    <Button
                      type="button"
                      disabled={!selectedAddonIngredientId || addonIngredientQuantity <= 0 || saveAddonIngredientMutation.isPending}
                      onClick={() => saveAddonIngredientMutation.mutate()}
                    >
                      Add usage
                    </Button>
                  </div>
                ) : null}
                <div className="mt-4 space-y-2">
                  {addonIngredientRows.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-[#eadbcb] bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-[#241610]">{row.ingredientName}</div>
                          <div className="text-[#7b685c]">
                            {row.quantityRequired} {row.ingredientUnit} / cost {formatMoney(row.quantityRequired * row.costPerUnit)}
                          </div>
                        </div>
                        {canEdit ? (
                          <button type="button" className="font-semibold text-[#a14f43]" onClick={() => deleteAddonIngredientMutation.mutate(row.id)}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                <div className="font-semibold text-[#241610]">Link add-ons to products</div>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="mt-3 h-12 w-full rounded-2xl bg-white px-4"
                >
                  <option value="">Choose product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {selectedProductId && canEdit ? (
                  <div className="mt-3 flex gap-2">
                    <select value={linkAddonId} onChange={(event) => setLinkAddonId(event.target.value)} className="h-12 min-w-0 flex-1 rounded-2xl bg-white px-4">
                      <option value="">Add-on</option>
                      {addons.filter((addon) => addon.isActive).map((addon) => (
                        <option key={addon.id} value={addon.id}>
                          {addon.name}
                        </option>
                      ))}
                    </select>
                    <Button type="button" disabled={!linkAddonId || saveProductAddonLinkMutation.isPending} onClick={() => saveProductAddonLinkMutation.mutate()}>
                      Link
                    </Button>
                  </div>
                ) : null}
                <div className="mt-4 space-y-2">
                  {addonLinkRows.map((link) => (
                    <div key={link.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadbcb] bg-white p-3 text-sm">
                      <span className="font-medium text-[#241610]">{link.addonName}</span>
                      {canEdit ? (
                        <button type="button" className="font-semibold text-[#a14f43]" onClick={() => deleteProductAddonLinkMutation.mutate(link.id)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {ingredientEditorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto border-[#eadbcb] bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Ingredient editor</div>
                <h2 className="mt-2 text-3xl font-semibold text-[#241610]">{ingredientForm.id ? "Update ingredient" : "Create ingredient"}</h2>
              </div>
              <button type="button" className="text-sm font-medium text-[#7b685c]" onClick={() => setIngredientEditorOpen(false)}>
                Close
              </button>
            </div>
            <form
              className="mt-6 grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveIngredientMutation.mutate(ingredientForm);
              }}
            >
              {(["name", "sku", "category", "unit", "supplier"] as const).map((field) => (
                <label key={field} className="space-y-2">
                  <span className="text-sm font-medium capitalize text-[#5f4637]">{field === "sku" ? "SKU" : field}</span>
                  <input
                    value={ingredientForm[field]}
                    onChange={(event) => setIngredientForm((state) => ({ ...state, [field]: event.target.value }))}
                    className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                    required={field !== "supplier"}
                  />
                </label>
              ))}
              {(["quantityOnHand", "lowStockThreshold", "costPerUnit"] as const).map((field) => (
                <label key={field} className="space-y-2">
                  <span className="text-sm font-medium text-[#5f4637]">
                    {field === "quantityOnHand" ? "Quantity on hand" : field === "lowStockThreshold" ? "Low-stock threshold" : "Cost per unit"}
                  </span>
                  <input
                    type="number"
                    step="0.001"
                    value={ingredientForm[field]}
                    onChange={(event) => setIngredientForm((state) => ({ ...state, [field]: numberValue(event.target.value) }))}
                    className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                  />
                </label>
              ))}
              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={ingredientForm.isActive}
                  onChange={(event) => setIngredientForm((state) => ({ ...state, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-[#5f4637]">Ingredient is active</span>
              </label>
              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saveIngredientMutation.isPending}>
                  {saveIngredientMutation.isPending ? "Saving..." : "Save ingredient"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIngredientEditorOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {addonEditorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="w-full max-w-xl border-[#eadbcb] bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Add-on editor</div>
                <h2 className="mt-2 text-3xl font-semibold text-[#241610]">{addonForm.id ? "Update add-on" : "Create add-on"}</h2>
              </div>
              <button type="button" className="text-sm font-medium text-[#7b685c]" onClick={() => setAddonEditorOpen(false)}>
                Close
              </button>
            </div>
            <form
              className="mt-6 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveAddonMutation.mutate(addonForm);
              }}
            >
              {(["name", "sku", "description"] as const).map((field) => (
                <label key={field} className="space-y-2">
                  <span className="text-sm font-medium capitalize text-[#5f4637]">{field === "sku" ? "SKU" : field}</span>
                  <input
                    value={addonForm[field]}
                    onChange={(event) => setAddonForm((state) => ({ ...state, [field]: event.target.value }))}
                    className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                    required={field !== "description"}
                  />
                </label>
              ))}
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Price</span>
                <input
                  type="number"
                  step="0.01"
                  value={addonForm.priceDelta}
                  onChange={(event) => setAddonForm((state) => ({ ...state, priceDelta: numberValue(event.target.value) }))}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                />
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={addonForm.isActive}
                  onChange={(event) => setAddonForm((state) => ({ ...state, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-[#5f4637]">Add-on is active</span>
              </label>
              <div className="flex gap-3">
                <Button type="submit" disabled={saveAddonMutation.isPending}>
                  {saveAddonMutation.isPending ? "Saving..." : "Save add-on"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAddonEditorOpen(false)}>
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
