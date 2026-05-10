import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgePercent, PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AppRole, DiscountFormValues } from "@cafe/shared-types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

const discountSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Code is required."),
  name: z.string().min(2, "Name is required."),
  scope: z.enum(["senior", "pwd", "promo", "manual"]),
  valueType: z.enum(["fixed", "percent"]),
  valueAmount: z.coerce.number().min(0.01, "Value must be greater than zero."),
  description: z.string().min(4, "Add a short description."),
  allowedRoles: z.array(z.enum(["admin", "manager", "cashier"])).min(1, "Select at least one role."),
  isActive: z.boolean(),
  expiresAt: z.string()
});

const roleOptions: AppRole[] = ["admin", "manager", "cashier"];

const emptyDiscount: DiscountFormValues = {
  code: "",
  name: "",
  scope: "promo",
  valueType: "percent",
  valueAmount: 10,
  description: "",
  allowedRoles: ["admin", "manager", "cashier"],
  isActive: true,
  expiresAt: ""
};

export function DiscountsPage() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);

  const discountsQuery = useQuery({
    queryKey: ["discounts", "all"],
    queryFn: () => apiClient.discounts()
  });

  const discountForm = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: emptyDiscount
  });

  const saveMutation = useMutation({
    mutationFn: (values: DiscountFormValues) => apiClient.saveDiscount(values),
    onSuccess: () => {
      toast.success("Discount saved.");
      setEditorOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
    onError: (error) => toast.error(error.message)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.toggleDiscount(id, isActive),
    onSuccess: () => {
      toast.success("Discount status updated.");
      void queryClient.invalidateQueries({ queryKey: ["discounts"] });
    },
    onError: (error) => toast.error(error.message)
  });

  useEffect(() => {
    if (!editorOpen) {
      discountForm.reset(emptyDiscount);
    }
  }, [discountForm, editorOpen]);

  const discounts = discountsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Discount controls</div>
            <h1 className="mt-3 font-display text-4xl text-[#241610]">Manage promos and cafe discounts</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
              Configure senior, PWD, promo, and manager-only discounts that cashiers can apply safely at checkout.
            </p>
          </div>
          <Button
            onClick={() => {
              discountForm.reset(emptyDiscount);
              setEditorOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New discount
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {discountsQuery.isLoading ? <Card className="p-6 text-sm text-[#7b685c]">Loading discounts...</Card> : null}
        {discountsQuery.isError ? <Card className="p-6 text-sm text-rose-500">{discountsQuery.error.message}</Card> : null}
        {discounts.map((discount) => (
          <Card key={discount.id} className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">{discount.scope}</div>
                <h2 className="mt-2 text-xl font-semibold text-[#241610]">{discount.name}</h2>
                <p className="mt-1 text-sm text-[#7b685c]">{discount.code}</p>
              </div>
              <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                <BadgePercent className="h-4 w-4" />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[#7b685c]">{discount.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#eadbcb] px-3 py-1 text-sm font-medium text-[#6c584b]">
                {discount.valueType === "percent" ? `${discount.valueAmount}% off` : `PHP ${discount.valueAmount.toFixed(2)} off`}
              </span>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${discount.isActive ? "bg-[#f3e7d8] text-[#7a4a2e]" : "bg-[#efe3d3] text-[#7b685c]"}`}>
                {discount.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-4 text-sm text-[#7b685c]">Roles: {discount.allowedRoles.join(", ")}</div>
            {discount.expiresAt ? <div className="mt-2 text-sm text-[#7b685c]">Expires {new Date(discount.expiresAt).toLocaleDateString("en-PH")}</div> : null}

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  discountForm.reset({
                    id: discount.id,
                    code: discount.code,
                    name: discount.name,
                    scope: discount.scope,
                    valueType: discount.valueType,
                    valueAmount: discount.valueAmount,
                    description: discount.description,
                    allowedRoles: discount.allowedRoles,
                    isActive: discount.isActive,
                    expiresAt: discount.expiresAt ? discount.expiresAt.slice(0, 10) : ""
                  });
                  setEditorOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 border border-[#eadbcb] bg-white"
                onClick={() => toggleMutation.mutate({ id: discount.id, isActive: !discount.isActive })}
              >
                {discount.isActive ? "Disable" : "Enable"}
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2418]/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto border-[#eadbcb] bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Discount editor</div>
                <h2 className="mt-2 text-3xl font-semibold text-[#241610]">
                  {discountForm.getValues("id") ? "Update discount" : "Create discount"}
                </h2>
              </div>
              <button type="button" className="text-sm font-medium text-[#7b685c]" onClick={() => setEditorOpen(false)}>
                Close
              </button>
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={discountForm.handleSubmit((values) => saveMutation.mutate(values))}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Code</span>
                <input {...discountForm.register("code")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {discountForm.formState.errors.code ? <p className="text-sm text-rose-500">{discountForm.formState.errors.code.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Name</span>
                <input {...discountForm.register("name")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {discountForm.formState.errors.name ? <p className="text-sm text-rose-500">{discountForm.formState.errors.name.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Scope</span>
                <select {...discountForm.register("scope")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                  <option value="promo">Promo</option>
                  <option value="senior">Senior Citizen</option>
                  <option value="pwd">PWD</option>
                  <option value="manual">Manual</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Value type</span>
                <select {...discountForm.register("valueType")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Value</span>
                <input type="number" step="0.01" {...discountForm.register("valueAmount")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {discountForm.formState.errors.valueAmount ? (
                  <p className="text-sm text-rose-500">{discountForm.formState.errors.valueAmount.message}</p>
                ) : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Expires on</span>
                <input type="date" {...discountForm.register("expiresAt")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[#5f4637]">Description</span>
                <textarea {...discountForm.register("description")} rows={4} className="w-full rounded-2xl bg-[#fffdf9] px-4 py-3" />
                {discountForm.formState.errors.description ? (
                  <p className="text-sm text-rose-500">{discountForm.formState.errors.description.message}</p>
                ) : null}
              </label>

              <div className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[#5f4637]">Allowed roles</span>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => {
                    const selected = discountForm.watch("allowedRoles").includes(role);

                    return (
                      <button
                        key={role}
                        type="button"
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          selected ? "bg-[#7a4a2e] text-white" : "border border-[#eadbcb] bg-white text-[#6c584b]"
                        }`}
                        onClick={() => {
                          const current = discountForm.getValues("allowedRoles");
                          const next = selected ? current.filter((item) => item !== role) : [...current, role];
                          discountForm.setValue("allowedRoles", next, { shouldValidate: true });
                        }}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
                {discountForm.formState.errors.allowedRoles ? (
                  <p className="text-sm text-rose-500">{discountForm.formState.errors.allowedRoles.message}</p>
                ) : null}
              </div>

              <label className="flex items-center gap-3 md:col-span-2">
                <input type="checkbox" {...discountForm.register("isActive")} className="h-4 w-4 rounded border-[#d9c2ac]" />
                <span className="text-sm text-[#5f4637]">This discount is available at checkout.</span>
              </label>

              <div className="flex gap-3 md:col-span-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : "Save discount"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>
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
