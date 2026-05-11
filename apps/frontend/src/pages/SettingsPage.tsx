import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { BadgeCheck, Building2, CreditCard, Palette, Percent, ReceiptText, Save, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

type CafeSettings = {
  cafeName: string;
  branchName: string;
  contactNumber: string;
  email: string;
  address: string;
  businessInfo: string;
  receiptHeader: string;
  receiptFooter: string;
  showLogo: boolean;
  showCashierName: boolean;
  showOrderNumber: boolean;
  taxLabel: string;
  taxRate: number;
  currency: string;
  defaultOrderType: "Dine in" | "Takeout" | "Delivery";
  stockWarning: boolean;
  lowStockThreshold: number;
  requirePaymentReference: boolean;
  autoPrintReceipt: boolean;
  seniorDiscount: boolean;
  pwdDiscount: boolean;
  defaultDiscountPercent: number;
  promoCodes: boolean;
  manualDiscountRoles: string;
  compactMode: boolean;
};

const storageKey = "cozy-cafe-pos-session-settings";

const defaultSettings: CafeSettings = {
  cafeName: "Cozy Cafe",
  branchName: "Main Counter",
  contactNumber: "+63 917 000 0000",
  email: "hello@cozycafe.local",
  address: "123 Espresso Lane, Manila",
  businessInfo: "VAT Registered / TIN available on official receipt",
  receiptHeader: "Cozy Cafe POS",
  receiptFooter: "Thank you for visiting Cozy Cafe.",
  showLogo: true,
  showCashierName: true,
  showOrderNumber: true,
  taxLabel: "VAT",
  taxRate: 12,
  currency: "PHP",
  defaultOrderType: "Dine in",
  stockWarning: true,
  lowStockThreshold: 10,
  requirePaymentReference: true,
  autoPrintReceipt: false,
  seniorDiscount: true,
  pwdDiscount: true,
  defaultDiscountPercent: 20,
  promoCodes: true,
  manualDiscountRoles: "Admin, Manager",
  compactMode: false
};

function loadSettings() {
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    return stored ? { ...defaultSettings, ...(JSON.parse(stored) as Partial<CafeSettings>) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

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
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-medium text-[#5f4637]">{label}</span>
      {children}
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
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState<CafeSettings>(() => loadSettings());

  const setValue = <Key extends keyof CafeSettings>(key: Key, value: CafeSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const validationError = useMemo(() => {
    if (!settings.cafeName.trim()) {
      return "Cafe name is required.";
    }

    if (settings.email && !/^\S+@\S+\.\S+$/.test(settings.email)) {
      return "Enter a valid cafe email address.";
    }

    if (settings.taxRate < 0 || settings.taxRate > 100) {
      return "Tax rate must be between 0 and 100.";
    }

    if (settings.lowStockThreshold < 0) {
      return "Low stock threshold cannot be negative.";
    }

    if (settings.defaultDiscountPercent < 0 || settings.defaultDiscountPercent > 100) {
      return "Default discount must be between 0 and 100.";
    }

    return null;
  }, [settings]);

  const handleSave = (event: FormEvent) => {
    event.preventDefault();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    window.sessionStorage.setItem(storageKey, JSON.stringify(settings));
    toast.success("Settings saved locally for this session.");
  };

  return (
    <form className="space-y-6" onSubmit={handleSave}>
      <section className="flex flex-col gap-4 rounded-[28px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-5 shadow-[0_18px_38px_rgba(74,43,24,0.07)] md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Cozy Cafe POS</div>
          <h1 className="mt-2 font-display text-3xl text-[#241610]">Cafe Configuration</h1>
        </div>
        <Button type="submit" disabled={Boolean(validationError)}>
          <Save className="mr-2 h-4 w-4" />
          Save settings
        </Button>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6 xl:grid-cols-2">
          <Section icon={Building2} title="Cafe Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Cafe name">
                <input value={settings.cafeName} onChange={(event) => setValue("cafeName", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle checked={settings.showLogo} label="Show logo" onChange={(value) => setValue("showLogo", value)} />
                <Toggle checked={settings.showCashierName} label="Show cashier name" onChange={(value) => setValue("showCashierName", value)} />
                <Toggle checked={settings.showOrderNumber} label="Show order number" onChange={(value) => setValue("showOrderNumber", value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tax label">
                  <input value={settings.taxLabel} onChange={(event) => setValue("taxLabel", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
                <Field label="Tax rate">
                  <input type="number" value={settings.taxRate} onChange={(event) => setValue("taxRate", Number(event.target.value))} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
                <Field label="Currency">
                  <select value={settings.currency} onChange={(event) => setValue("currency", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                    <option>PHP</option>
                    <option>USD</option>
                  </select>
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={CreditCard} title="POS Preferences">
            <div className="grid gap-4">
              <Field label="Default order type">
                <select value={settings.defaultOrderType} onChange={(event) => setValue("defaultOrderType", event.target.value as CafeSettings["defaultOrderType"])} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4">
                  <option>Dine in</option>
                  <option>Takeout</option>
                  <option>Delivery</option>
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle checked={settings.stockWarning} label="Stock warning" onChange={(value) => setValue("stockWarning", value)} />
                <Toggle checked={settings.requirePaymentReference} label="Require digital reference" onChange={(value) => setValue("requirePaymentReference", value)} />
                <Toggle checked={settings.autoPrintReceipt} label="Auto-print receipt" onChange={(value) => setValue("autoPrintReceipt", value)} />
              </div>
              <Field label="Low stock threshold">
                <input type="number" value={settings.lowStockThreshold} onChange={(event) => setValue("lowStockThreshold", Number(event.target.value))} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
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
                  <input type="number" value={settings.defaultDiscountPercent} onChange={(event) => setValue("defaultDiscountPercent", Number(event.target.value))} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
                <Field label="Manual discount roles">
                  <input value={settings.manualDiscountRoles} onChange={(event) => setValue("manualDiscountRoles", event.target.value)} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={Palette} title="Appearance / Branding">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <BrandLogo className="h-20 rounded-2xl border border-[#eadbcb] bg-white object-contain p-2" />
                <div>
                  <div className="font-semibold text-[#241610]">Cozy Cafe POS</div>
                  <div className="mt-1 text-sm text-[#7b685c]">Theme: White & Brown</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full border border-[#d9c2ac] bg-[#7a4a2e]" />
                <span className="h-10 w-10 rounded-full border border-[#d9c2ac] bg-[#f3e7d8]" />
                <span className="h-10 w-10 rounded-full border border-[#d9c2ac] bg-white" />
              </div>
            </div>
            <div className="mt-5">
              <Toggle checked={settings.compactMode} label="Compact mode preference" onChange={(value) => setValue("compactMode", value)} />
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Account / System Info">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Current role", user?.role ?? "Not signed in"],
                ["Current email", user?.email ?? "No user email"],
                ["App version", "0.1.0"],
                ["Supabase", "Configured"]
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

            <div className="mt-5 rounded-[24px] border border-[#eadbcb] bg-[#fffdf9] p-5 font-mono text-sm text-[#3b2418]">
              <div className="text-center">
                {settings.showLogo ? <BrandLogo className="mx-auto h-16 object-contain" /> : null}
                <div className="mt-3 font-bold">{settings.receiptHeader}</div>
                <div>{settings.branchName}</div>
                <div className="text-[#7b685c]">{settings.address}</div>
              </div>
              <div className="my-4 border-t border-dashed border-[#d9c2ac]" />
              {settings.showOrderNumber ? <div>Order: CC-1028</div> : null}
              {settings.showCashierName ? <div>Cashier: {user?.name ?? "Cafe Cashier"}</div> : null}
              <div className="my-4 border-t border-dashed border-[#d9c2ac]" />
              <div className="flex justify-between">
                <span>Americano x1</span>
                <span>{settings.currency} 135.00</span>
              </div>
              <div className="flex justify-between">
                <span>{settings.taxLabel} {settings.taxRate}%</span>
                <span>{settings.currency} 16.20</span>
              </div>
              <div className="mt-3 flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{settings.currency} 151.20</span>
              </div>
              <div className="my-4 border-t border-dashed border-[#d9c2ac]" />
              <div className="text-center text-xs text-[#7b685c]">{settings.receiptFooter}</div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#eadbcb] bg-[#fffaf4] p-4 text-sm text-[#7b685c]">
              These settings are local to this browser session until a database-backed cafe settings table is added.
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
