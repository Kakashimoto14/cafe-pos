import type { CafeSettings, OrderChannel } from "@cafe/shared-types";
import cozyCafeLogo from "@/assets/brand/cozy-cafe-pos-logo.png";

const PHONE_PATTERN = /^[+()\d\s-]{7,20}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function safeTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function removeUndefinedFields<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;
}

export const DEFAULT_CAFE_SETTINGS: CafeSettings = {
  storeName: "Cozy Cafe",
  branchName: "Main Counter",
  contactNumber: "+63 917 000 0000",
  email: "hello@cozycafe.local",
  address: "123 Espresso Lane, Manila",
  businessInfo: "VAT Registered / TIN available on official receipt",
  logoUrl: "",
  receiptHeader: "Cozy Cafe POS",
  receiptFooter: "Thank you for visiting Cozy Cafe.",
  receiptNotes: "Please come again soon.",
  showLogo: true,
  showCashierName: true,
  showOrderNumber: true,
  showQueueNumber: true,
  taxLabel: "VAT",
  taxRate: 12,
  currency: "PHP",
  defaultOrderType: "dine_in",
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

export function mergeCafeSettings(settings?: Partial<CafeSettings> | null): CafeSettings {
  return {
    ...DEFAULT_CAFE_SETTINGS,
    ...removeUndefinedFields(settings ?? {})
  };
}

export function mergeReceiptSnapshotWithSettings(
  snapshot?: Partial<CafeSettings> | null,
  currentSettings?: Partial<CafeSettings> | null
) {
  return mergeCafeSettings({
    ...removeUndefinedFields(snapshot ?? {}),
    ...removeUndefinedFields(currentSettings ?? {})
  });
}

export function normalizeCafeSettingsInput(settings: CafeSettings): CafeSettings {
  return mergeCafeSettings({
    ...settings,
    storeName: safeTrim(settings.storeName),
    branchName: safeTrim(settings.branchName),
    contactNumber: safeTrim(settings.contactNumber),
    email: safeTrim(settings.email),
    address: safeTrim(settings.address),
    businessInfo: safeTrim(settings.businessInfo),
    logoUrl: safeTrim(settings.logoUrl),
    receiptHeader: safeTrim(settings.receiptHeader),
    receiptFooter: safeTrim(settings.receiptFooter),
    receiptNotes: safeTrim(settings.receiptNotes),
    taxLabel: safeTrim(settings.taxLabel),
    currency: safeTrim(settings.currency).toUpperCase(),
    manualDiscountRoles: safeTrim(settings.manualDiscountRoles)
  });
}

export function isSafeLogoUrl(value?: string | null) {
  if (!value) {
    return true;
  }

  const trimmed = safeTrim(value);

  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith("data:image/")) {
    return true;
  }

  if (trimmed.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateCafeSettings(settings: CafeSettings) {
  if (!safeTrim(settings.storeName)) {
    return "Store name is required.";
  }

  if (safeTrim(settings.email) && !EMAIL_PATTERN.test(safeTrim(settings.email))) {
    return "Enter a valid store email address.";
  }

  if (safeTrim(settings.contactNumber) && !PHONE_PATTERN.test(safeTrim(settings.contactNumber))) {
    return "Enter a valid contact number.";
  }

  if (!isSafeLogoUrl(settings.logoUrl)) {
    return "Logo must be a secure image URL, a local path, or an uploaded image.";
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
}

export function getBrandLogoUrl(settings?: Partial<CafeSettings> | null) {
  const merged = mergeCafeSettings(settings);
  return safeTrim(merged.logoUrl) ? safeTrim(merged.logoUrl) : cozyCafeLogo;
}

export function getBusinessContactLines(settings?: Partial<CafeSettings> | null) {
  const merged = mergeCafeSettings(settings);

  return [merged.branchName, merged.address, merged.contactNumber, merged.email, merged.businessInfo].filter(Boolean);
}

export function getReceiptTitle(settings?: Partial<CafeSettings> | null) {
  const merged = mergeCafeSettings(settings);
  return safeTrim(merged.receiptHeader) || safeTrim(merged.storeName);
}

export function formatOrderChannelLabel(channel: OrderChannel) {
  switch (channel) {
    case "dine_in":
      return "Dine in";
    case "takeout":
      return "Takeout";
    case "delivery":
      return "Delivery";
    default:
      return channel;
  }
}
