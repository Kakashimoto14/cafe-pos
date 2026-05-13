import type { CafeSettings, OrderChannel } from "@cafe/shared-types";
import cozyCafeLogo from "@/assets/brand/cozy-cafe-pos-logo.png";

const PHONE_PATTERN = /^[+()\d\s-]{7,20}$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

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
    ...(settings ?? {})
  };
}

export function normalizeCafeSettingsInput(settings: CafeSettings): CafeSettings {
  return mergeCafeSettings({
    ...settings,
    storeName: settings.storeName.trim(),
    branchName: settings.branchName.trim(),
    contactNumber: settings.contactNumber.trim(),
    email: settings.email.trim(),
    address: settings.address.trim(),
    businessInfo: settings.businessInfo.trim(),
    logoUrl: settings.logoUrl?.trim() ?? "",
    receiptHeader: settings.receiptHeader.trim(),
    receiptFooter: settings.receiptFooter.trim(),
    receiptNotes: settings.receiptNotes.trim(),
    taxLabel: settings.taxLabel.trim(),
    currency: settings.currency.trim().toUpperCase(),
    manualDiscountRoles: settings.manualDiscountRoles.trim()
  });
}

export function isSafeLogoUrl(value?: string | null) {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();

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
  if (!settings.storeName.trim()) {
    return "Store name is required.";
  }

  if (settings.email.trim() && !EMAIL_PATTERN.test(settings.email.trim())) {
    return "Enter a valid store email address.";
  }

  if (settings.contactNumber.trim() && !PHONE_PATTERN.test(settings.contactNumber.trim())) {
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
  return merged.logoUrl?.trim() ? merged.logoUrl.trim() : cozyCafeLogo;
}

export function getBusinessContactLines(settings?: Partial<CafeSettings> | null) {
  const merged = mergeCafeSettings(settings);

  return [merged.branchName, merged.address, merged.contactNumber, merged.email, merged.businessInfo].filter(Boolean);
}

export function getReceiptTitle(settings?: Partial<CafeSettings> | null) {
  const merged = mergeCafeSettings(settings);
  return merged.receiptHeader.trim() || merged.storeName.trim();
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
