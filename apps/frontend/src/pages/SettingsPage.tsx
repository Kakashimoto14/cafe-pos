import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Building2, CreditCard, ImageUp, Palette, Percent, ReceiptText, Save, ShieldCheck } from "lucide-react";
import type { CafeSettings } from "@cafe/shared-types";
import { toast } from "sonner";
import { ReceiptDocument } from "@/components/sales/ReceiptDocument";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageErrorState, SectionCardSkeleton } from "@/components/ui/page-states";
import { useCafeSettings } from "@/hooks/use-cafe-settings";
import { DEFAULT_CAFE_SETTINGS, formatOrderChannelLabel, normalizeCafeSettingsInput, validateCafeSettings } from "@/lib/cafe-settings";
import { createSampleReceiptData } from "@/lib/receipt";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

function Toggle({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#eadbcb] bg-[#fffdf9] px-4 py-3">
      <span className="text-sm font-medium text-[#4f3526]">{label}</span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" className="h-5 w-5 accent-[#7a4a2e]" />
    </label>
  );
}

function Field({
  label,
  helper,
  children,
  className = ""
}: {
  label: string;
  helper?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-medium text-[#5f4637]">{label}</span>
      {children}
      {helper ? <p className="text-xs text-[#8f7767]">{helper}</p> : null}
    </label>
  );
}

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: typeof Building2;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-[#eadbcb] bg-white p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold text-[#241610]">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const settingsQuery = useCafeSettings();
  const [settings, setSettings] = useState<CafeSettings>(DEFAULT_CAFE_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (settingsQuery.data && !hydrated) {
      setSettings(settingsQuery.data);
      setHydrated(true);
    }
  }, [hydrated, settingsQuery.data]);

  const setValue = <Key extends keyof CafeSettings>(key: Key, value: CafeSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: (values: CafeSettings) => apiClient.saveBusinessSettings(values),
    onSuccess: (savedSettings) => {
      setSettings(savedSettings);
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Receipt and business settings saved.");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const validationError = useMemo(() => validateCafeSettings(settings), [settings]);
  const previewOrder = useMemo(() => createSampleReceiptData(settings, user?.name ?? "Cafe Cashier"), [settings, user?.name]);

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for the logo.");
      return;
    }

    if (file.size > 1_000_000) {
      toast.error("Keep the logo under 1 MB for fast receipts and reports.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setValue("logoUrl", result);
      toast.success("Logo updated in the form. Save to apply it everywhere.");
    };
    reader.onerror = () => {
      toast.error("The logo could not be read.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    saveMutation.mutate(normalizeCafeSettingsInput(settings));
  };

  if (settingsQuery.isLoading && !hydrated) {
    return <SectionCardSkeleton rows={5} />;
  }

  return (
    <form className="space-y-6" onSubmit={handleSave}>
      <section className="flex flex-col gap-4 rounded-[28px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-5 shadow-[0_18px_38px_rgba(74,43,24,0.07)] md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Store setup</div>
          <h1 className="mt-2 font-display text-3xl text-[#241610]">Cafe Configuration</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#7b685c]">
            Save the branding, receipt, and POS rules that should be reused across receipts, reports, and print layouts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {settingsQuery.isError ? (
            <span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
              Using fallback settings
            </span>
          ) : null}
          <Button type="submit" disabled={Boolean(validationError) || saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </section>

      {settingsQuery.isError ? (
        <PageErrorState
          title="Using fallback settings"
          message={`${settingsQuery.error.message} The form is still available with safe fallback values, but the latest business settings could not be loaded from Supabase.`}
          onRetry={() => void settingsQuery.refetch()}
        />
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6 xl:grid-cols-2">
          <Section icon={Building2} title="Cafe Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Store name">
                <input value={settings.storeName} onChange={(event) => setValue("storeName", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
              <Field label="Branch / location">
                <input value={settings.branchName} onChange={(event) => setValue("branchName", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
              <Field label="Contact number">
                <input value={settings.contactNumber} onChange={(event) => setValue("contactNumber", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
              <Field label="Email">
                <input value={settings.email} onChange={(event) => setValue("email", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
              <Field label="Address" className="md:col-span-2">
                <textarea value={settings.address} onChange={(event) => setValue("address", event.target.value)} rows={3} className="w-full rounded-2xl bg-[#fffdf9] px-4 py-3" />
              </Field>
              <Field label="Business / tax info" className="md:col-span-2">
                <input value={settings.businessInfo} onChange={(event) => setValue("businessInfo", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
            </div>
          </Section>

          <Section icon={ReceiptText} title="Receipt Settings">
            <div className="grid gap-4">
              <Field label="Receipt header">
                <input value={settings.receiptHeader} onChange={(event) => setValue("receiptHeader", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
              <Field label="Receipt footer">
                <input value={settings.receiptFooter} onChange={(event) => setValue("receiptFooter", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
              <Field label="Receipt notes" helper="This appears near the bottom of printed and on-screen receipts.">
                <textarea value={settings.receiptNotes} onChange={(event) => setValue("receiptNotes", event.target.value)} rows={3} className="w-full rounded-2xl bg-[#fffdf9] px-4 py-3" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle checked={settings.showLogo} label="Show logo" onChange={(value) => setValue("showLogo", value)} />
                <Toggle checked={settings.showCashierName} label="Show cashier name" onChange={(value) => setValue("showCashierName", value)} />
                <Toggle checked={settings.showOrderNumber} label="Show order number" onChange={(value) => setValue("showOrderNumber", value)} />
                <Toggle checked={settings.showQueueNumber} label="Show queue number" onChange={(value) => setValue("showQueueNumber", value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tax label">
                  <input value={settings.taxLabel} onChange={(event) => setValue("taxLabel", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
                <Field label="Tax rate">
                  <input type="number" min={0} max={100} step="0.01" value={settings.taxRate} onChange={(event) => setValue("taxRate", Number(event.target.value))} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
                <Field label="Currency">
                  <input value={settings.currency} onChange={(event) => setValue("currency", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4 uppercase" />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={CreditCard} title="POS Preferences">
            <div className="grid gap-4">
              <Field label="Default order type">
                <select
                  value={settings.defaultOrderType}
                  onChange={(event) => setValue("defaultOrderType", event.target.value as CafeSettings["defaultOrderType"])}
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                >
                  {(["dine_in", "takeout", "delivery"] as const).map((value) => (
                    <option key={value} value={value}>
                      {formatOrderChannelLabel(value)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle checked={settings.stockWarning} label="Stock warning" onChange={(value) => setValue("stockWarning", value)} />
                <Toggle checked={settings.requirePaymentReference} label="Require digital reference" onChange={(value) => setValue("requirePaymentReference", value)} />
                <Toggle checked={settings.autoPrintReceipt} label="Auto-print receipt" onChange={(value) => setValue("autoPrintReceipt", value)} />
              </div>
              <Field label="Low stock threshold">
                <input type="number" min={0} value={settings.lowStockThreshold} onChange={(event) => setValue("lowStockThreshold", Number(event.target.value))} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
              </Field>
            </div>
          </Section>

          <Section icon={Percent} title="Discount Settings">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle checked={settings.seniorDiscount} label="Senior Citizen discount" onChange={(value) => setValue("seniorDiscount", value)} />
                <Toggle checked={settings.pwdDiscount} label="PWD discount" onChange={(value) => setValue("pwdDiscount", value)} />
                <Toggle checked={settings.promoCodes} label="Allow promo codes" onChange={(value) => setValue("promoCodes", value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Default discount %">
                  <input type="number" min={0} max={100} step="0.01" value={settings.defaultDiscountPercent} onChange={(event) => setValue("defaultDiscountPercent", Number(event.target.value))} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
                <Field label="Manual discount roles">
                  <input value={settings.manualDiscountRoles} onChange={(event) => setValue("manualDiscountRoles", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={Palette} title="Appearance / Branding">
            <div className="grid gap-4">
              <Field label="Logo image URL" helper="Use an HTTPS URL, a local path, or upload a small image below.">
                <input value={settings.logoUrl ?? ""} onChange={(event) => setValue("logoUrl", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" placeholder="https://example.com/logo.png" />
              </Field>
              <Field label="Upload logo" helper="Uploaded logos are stored as an image data URL for now.">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-[#eadbcb] bg-[#f4ece2] px-4 text-sm font-semibold text-[#5b3a29] transition hover:bg-[#efe3d3]">
                    <ImageUp className="mr-2 h-4 w-4" />
                    Choose image
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {settings.logoUrl ? (
                    <button type="button" className="text-sm font-semibold text-[#a14f43]" onClick={() => setValue("logoUrl", "")}>
                      Remove custom logo
                    </button>
                  ) : null}
                </div>
              </Field>
              <Toggle checked={settings.compactMode} label="Compact mode preference" onChange={(value) => setValue("compactMode", value)} />
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Account / System Info">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Current role", user?.role ?? "Not signed in"],
                ["Current email", user?.email ?? "No user email"],
                ["App version", "0.1.0"],
                ["Settings source", settingsQuery.isError ? "Fallback defaults" : "Supabase"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#eadbcb] bg-[#fffdf9] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7767]">{label}</div>
                  <div className="mt-2 break-words text-sm font-semibold text-[#241610]">{value}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside className="2xl:sticky 2xl:top-28 2xl:self-start">
          <Card className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Preview</div>
                <h2 className="text-xl font-semibold text-[#241610]">Receipt</h2>
              </div>
            </div>

            <div className="mt-5">
              <ReceiptDocument order={previewOrder} settings={settings} className="max-w-none bg-[#fffdf9] shadow-none" />
            </div>

            <div className="mt-4 rounded-2xl border border-[#eadbcb] bg-[#fffaf4] p-4 text-sm text-[#7b685c]">
              The saved settings from this page are reused for the receipt preview, new order receipts, report exports, and print layouts.
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
