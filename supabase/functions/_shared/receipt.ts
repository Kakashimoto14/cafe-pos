type ReceiptSettings = {
  storeName: string;
  branchName: string;
  contactNumber: string;
  email: string;
  address: string;
  businessInfo: string;
  logoUrl?: string;
  receiptHeader: string;
  receiptFooter: string;
  receiptNotes: string;
  showLogo: boolean;
  showCashierName: boolean;
  showOrderNumber: boolean;
  showQueueNumber: boolean;
  taxLabel: string;
  taxRate: number;
  currency: string;
};

type BusinessSettingsRow = {
  store_name?: string | null;
  branch_name?: string | null;
  contact_number?: string | null;
  email?: string | null;
  address?: string | null;
  business_info?: string | null;
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  receipt_notes?: string | null;
  show_logo?: boolean | null;
  show_cashier_name?: boolean | null;
  show_order_number?: boolean | null;
  show_queue_number?: boolean | null;
  tax_label?: string | null;
  tax_rate?: number | string | null;
  currency?: string | null;
};

type ReceiptOrderAddonRow = {
  addon_name: string;
  price_delta: number | string;
  quantity: number;
};

type ReceiptOrderItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  order_item_addons?: ReceiptOrderAddonRow[] | null;
};

type ReceiptOrderRow = {
  id: string;
  order_number: string;
  queue_number?: string | null;
  customer_email?: string | null;
  receipt_settings_snapshot?: Partial<ReceiptSettings> | null;
  order_type: string;
  payment_method: string;
  cashier_name?: string | null;
  notes?: string | null;
  subtotal: number | string;
  discount_label?: string | null;
  discount_total: number | string;
  tax_total: number | string;
  grand_total: number | string;
  amount_paid: number | string;
  change_due: number | string;
  payment_reference?: string | null;
  payment_notes?: string | null;
  created_at: string;
  order_items?: ReceiptOrderItemRow[] | null;
};

type ReceiptRow = {
  label: string;
  value: string;
  emphasis?: "highlight" | "total";
};

type ReceiptItemRow = {
  productName: string;
  quantityLabel: string;
  totalLabel: string;
  addons: string[];
};

export type ReceiptEmailViewModel = {
  subject: string;
  logoUrl?: string;
  headerTitle: string;
  storeName: string;
  branchName: string;
  contactLines: string[];
  metadataRows: ReceiptRow[];
  itemRows: ReceiptItemRow[];
  totalRows: ReceiptRow[];
  orderNoteRows: ReceiptRow[];
  footerLines: string[];
};

const DEFAULT_SETTINGS: ReceiptSettings = {
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
  currency: "PHP"
};

function safeTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function removeUndefinedFields<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatMoney(value: number, currency = "PHP") {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2
    }).format(value);
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatOrderType(value: string) {
  switch (value) {
    case "dine_in":
      return "Dine in";
    case "takeout":
      return "Takeout";
    case "delivery":
      return "Delivery";
    default:
      return value;
  }
}

function formatPaymentMethod(value: string) {
  switch (value) {
    case "cash":
      return "Cash";
    case "gcash":
      return "GCash";
    case "qr":
      return "QR Payment";
    case "instapay":
      return "InstaPay";
    case "maya":
      return "Maya";
    case "card":
      return "Card";
    default:
      return "Other";
  }
}

function toPublicLogoUrl(value?: string | null) {
  const trimmed = safeTrim(value);

  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function mapBusinessSettings(row?: BusinessSettingsRow | Record<string, unknown> | null): Partial<ReceiptSettings> {
  if (!row) {
    return {};
  }

  const businessSettingsRow = row as BusinessSettingsRow;

  return {
    storeName: businessSettingsRow.store_name ?? undefined,
    branchName: businessSettingsRow.branch_name ?? undefined,
    contactNumber: businessSettingsRow.contact_number ?? undefined,
    email: businessSettingsRow.email ?? undefined,
    address: businessSettingsRow.address ?? undefined,
    businessInfo: businessSettingsRow.business_info ?? undefined,
    logoUrl: businessSettingsRow.logo_url ?? undefined,
    receiptHeader: businessSettingsRow.receipt_header ?? undefined,
    receiptFooter: businessSettingsRow.receipt_footer ?? undefined,
    receiptNotes: businessSettingsRow.receipt_notes ?? undefined,
    showLogo: businessSettingsRow.show_logo ?? undefined,
    showCashierName: businessSettingsRow.show_cashier_name ?? undefined,
    showOrderNumber: businessSettingsRow.show_order_number ?? undefined,
    showQueueNumber: businessSettingsRow.show_queue_number ?? undefined,
    taxLabel: businessSettingsRow.tax_label ?? undefined,
    taxRate: businessSettingsRow.tax_rate == null ? undefined : toNumber(businessSettingsRow.tax_rate),
    currency: businessSettingsRow.currency ?? undefined
  };
}

function mergeSettings(snapshot?: Partial<ReceiptSettings> | null, current?: Partial<ReceiptSettings> | null): ReceiptSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...removeUndefinedFields(snapshot ?? {}),
    ...removeUndefinedFields(current ?? {})
  };
}

export function normalizeReceiptOrder(rawOrder: Record<string, unknown>) {
  const rawProfile = rawOrder.profiles as { full_name?: string | null } | Array<{ full_name?: string | null }> | null | undefined;
  const cashierProfile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

  return {
    id: String(rawOrder.id ?? ""),
    order_number: String(rawOrder.order_number ?? ""),
    queue_number: typeof rawOrder.queue_number === "string" ? rawOrder.queue_number : null,
    customer_email: typeof rawOrder.customer_email === "string" ? rawOrder.customer_email : null,
    receipt_settings_snapshot: (rawOrder.receipt_settings_snapshot as Partial<ReceiptSettings> | null | undefined) ?? null,
    order_type: String(rawOrder.order_type ?? ""),
    payment_method: String(rawOrder.payment_method ?? ""),
    cashier_name: cashierProfile?.full_name ?? "Unknown cashier",
    notes: typeof rawOrder.notes === "string" ? rawOrder.notes : null,
    subtotal: rawOrder.subtotal as number | string,
    discount_label: typeof rawOrder.discount_label === "string" ? rawOrder.discount_label : null,
    discount_total: rawOrder.discount_total as number | string,
    tax_total: rawOrder.tax_total as number | string,
    grand_total: rawOrder.grand_total as number | string,
    amount_paid: rawOrder.amount_paid as number | string,
    change_due: rawOrder.change_due as number | string,
    payment_reference: typeof rawOrder.payment_reference === "string" ? rawOrder.payment_reference : null,
    payment_notes: typeof rawOrder.payment_notes === "string" ? rawOrder.payment_notes : null,
    created_at: String(rawOrder.created_at ?? ""),
    order_items: ((rawOrder.order_items as Record<string, unknown>[] | null | undefined) ?? []).map((item) => ({
      id: String(item.id ?? ""),
      product_name: String(item.product_name ?? ""),
      quantity: Number(item.quantity ?? 0),
      unit_price: item.unit_price as number | string,
      line_total: item.line_total as number | string,
      order_item_addons: ((item.order_item_addons as Record<string, unknown>[] | null | undefined) ?? []).map((addon) => ({
        addon_name: String(addon.addon_name ?? ""),
        price_delta: addon.price_delta as number | string,
        quantity: Number(addon.quantity ?? 0)
      }))
    }))
  } satisfies ReceiptOrderRow;
}

export function buildReceiptEmailViewModel({
  order,
  businessSettings
}: {
  order: ReceiptOrderRow;
  businessSettings?: Partial<ReceiptSettings> | null;
}): ReceiptEmailViewModel {
  const settings = mergeSettings(order.receipt_settings_snapshot, businessSettings);
  const currency = settings.currency;
  const contactLines = [settings.address, settings.contactNumber, settings.email, settings.businessInfo]
    .map((value) => safeTrim(value))
    .filter(Boolean);
  const metadataRows: ReceiptRow[] = [];

  if (settings.showOrderNumber && order.order_number) {
    metadataRows.push({ label: "Order", value: order.order_number });
  }

  if (settings.showQueueNumber && order.queue_number) {
    metadataRows.push({ label: "Queue", value: order.queue_number, emphasis: "highlight" });
  }

  const cashierName = safeTrim(order.cashier_name);

  if (settings.showCashierName && cashierName) {
    metadataRows.push({ label: "Cashier", value: cashierName });
  }

  metadataRows.push(
    { label: "Date", value: formatDate(order.created_at) },
    { label: "Order type", value: formatOrderType(order.order_type) },
    { label: "Payment", value: formatPaymentMethod(order.payment_method) }
  );

  const paymentReference = safeTrim(order.payment_reference);

  if (paymentReference) {
    metadataRows.push({ label: "Reference", value: paymentReference });
  }

  const itemRows = (order.order_items ?? []).map((item) => ({
    productName: item.product_name,
    quantityLabel: `${item.quantity} x ${formatMoney(toNumber(item.unit_price), currency)}`,
    totalLabel: formatMoney(toNumber(item.line_total), currency),
    addons:
      item.order_item_addons?.map((addon) => {
        const quantityLabel = addon.quantity > 1 ? ` x${addon.quantity}` : "";
        return `+ ${addon.addon_name}${quantityLabel} / ${formatMoney(toNumber(addon.price_delta) * addon.quantity, currency)}`;
      }) ?? []
  }));

  const totalRows: ReceiptRow[] = [{ label: "Subtotal", value: formatMoney(toNumber(order.subtotal), currency) }];

  if (toNumber(order.discount_total) > 0) {
    totalRows.push({
      label: order.discount_label ? `Discount (${order.discount_label})` : "Discount",
      value: `-${formatMoney(toNumber(order.discount_total), currency)}`
    });
  }

  totalRows.push(
    {
      label: settings.taxRate > 0 ? `${settings.taxLabel} ${settings.taxRate}%` : settings.taxLabel,
      value: formatMoney(toNumber(order.tax_total), currency)
    },
    { label: "Total", value: formatMoney(toNumber(order.grand_total), currency), emphasis: "total" },
    { label: "Amount paid", value: formatMoney(toNumber(order.amount_paid), currency) },
    { label: "Change", value: formatMoney(toNumber(order.change_due), currency) }
  );

  const orderNoteRows: ReceiptRow[] = [];

  const orderNotes = safeTrim(order.notes);

  if (orderNotes) {
    orderNoteRows.push({ label: "Order note", value: orderNotes });
  }

  const paymentNotes = safeTrim(order.payment_notes);

  if (paymentNotes) {
    orderNoteRows.push({ label: "Payment note", value: paymentNotes });
  }

  const footerLines = [safeTrim(settings.receiptNotes), safeTrim(settings.receiptFooter)].filter(Boolean);
  const queueSuffix = settings.showQueueNumber && order.queue_number ? ` - Queue ${order.queue_number}` : "";

  return {
    subject: `Receipt from ${safeTrim(settings.storeName) || "Cozy Cafe"}${queueSuffix || ` - Order ${order.order_number}`}`,
    logoUrl: settings.showLogo ? toPublicLogoUrl(settings.logoUrl) : undefined,
    headerTitle: safeTrim(settings.receiptHeader) || safeTrim(settings.storeName),
    storeName: safeTrim(settings.storeName),
    branchName: safeTrim(settings.branchName),
    contactLines,
    metadataRows,
    itemRows,
    totalRows,
    orderNoteRows,
    footerLines
  };
}

export function renderReceiptEmailHtml(receipt: ReceiptEmailViewModel) {
  const headerLines = [receipt.storeName, receipt.branchName].filter(Boolean);
  const metadataRows = receipt.metadataRows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;color:#7b685c;font-size:13px;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;color:${row.emphasis === "highlight" ? "#7a4a2e" : "#2f2117"};font-size:${row.emphasis === "highlight" ? "15px" : "13px"};font-weight:${row.emphasis ? "700" : "500"};text-align:right;">
            ${escapeHtml(row.label === "Queue" ? `Queue No: ${row.value}` : row.value)}
          </td>
        </tr>
      `
    )
    .join("");
  const itemRows = receipt.itemRows
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #f0e4d6;vertical-align:top;">
            <div style="font-size:14px;font-weight:600;color:#2f2117;">${escapeHtml(item.productName)}</div>
            <div style="margin-top:4px;font-size:12px;color:#7b685c;">${escapeHtml(item.quantityLabel)}</div>
            ${
              item.addons.length > 0
                ? `<div style="margin-top:6px;font-size:12px;color:#7b685c;">${item.addons.map((addon) => `<div>${escapeHtml(addon)}</div>`).join("")}</div>`
                : ""
            }
          </td>
          <td style="padding:10px 0;border-top:1px solid #f0e4d6;vertical-align:top;text-align:right;font-size:14px;font-weight:600;color:#2f2117;">
            ${escapeHtml(item.totalLabel)}
          </td>
        </tr>
      `
    )
    .join("");
  const totalRows = receipt.totalRows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;color:${row.emphasis === "total" ? "#2f2117" : "#7b685c"};font-size:${row.emphasis === "total" ? "15px" : "13px"};font-weight:${row.emphasis === "total" ? "700" : "500"};">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding:6px 0;color:#2f2117;font-size:${row.emphasis === "total" ? "15px" : "13px"};font-weight:${row.emphasis === "total" ? "700" : "500"};text-align:right;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `
    )
    .join("");
  const noteRows = receipt.orderNoteRows
    .map(
      (row) => `
        <tr>
          <td colspan="2" style="padding:8px 0;color:#7b685c;font-size:12px;line-height:1.6;">
            <strong style="color:#5f4637;">${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}
          </td>
        </tr>
      `
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f7f1e8;font-family:Arial,Helvetica,sans-serif;color:#2f2117;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;background:#ffffff;border:1px solid #eadbcb;border-radius:24px;">
            <tr>
              <td style="padding:32px 28px;">
                <div style="text-align:center;">
                  ${receipt.logoUrl ? `<img src="${escapeHtml(receipt.logoUrl)}" alt="${escapeHtml(receipt.storeName)} logo" style="max-height:72px;width:auto;max-width:180px;" />` : ""}
                  <div style="margin-top:16px;font-size:24px;font-weight:700;color:#2f2117;">${escapeHtml(receipt.headerTitle)}</div>
                  ${headerLines.map((line, index) => `<div style="margin-top:${index === 0 ? "10px" : "4px"};font-size:${index === 0 ? "18px" : "15px"};color:#4f3526;">${escapeHtml(line)}</div>`).join("")}
                  <div style="margin-top:14px;font-size:13px;line-height:1.7;color:#7b685c;">
                    ${receipt.contactLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
                  </div>
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-collapse:collapse;">
                  ${metadataRows}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;">
                  ${itemRows}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-top:1px solid #eadbcb;border-collapse:collapse;">
                  ${totalRows}
                </table>

                ${
                  noteRows
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-top:1px solid #eadbcb;border-collapse:collapse;">${noteRows}</table>`
                    : ""
                }

                ${
                  receipt.footerLines.length > 0
                    ? `<div style="margin-top:24px;border-top:1px solid #eadbcb;padding-top:18px;text-align:center;font-size:12px;line-height:1.7;color:#7b685c;">
                        ${receipt.footerLines.map((line, index) => `<div style="${index === 0 ? "text-transform:uppercase;letter-spacing:0.18em;" : ""}">${escapeHtml(line)}</div>`).join("")}
                      </div>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderReceiptEmailText(receipt: ReceiptEmailViewModel) {
  const metadataLines = receipt.metadataRows.map((row) => `${row.label}: ${row.label === "Queue" ? `Queue No: ${row.value}` : row.value}`);
  const itemLines = receipt.itemRows.flatMap((item) => [`${item.productName} - ${item.quantityLabel} - ${item.totalLabel}`, ...item.addons.map((addon) => `  ${addon}`)]);
  const totalLines = receipt.totalRows.map((row) => `${row.label}: ${row.value}`);
  const noteLines = receipt.orderNoteRows.map((row) => `${row.label}: ${row.value}`);

  return [
    receipt.headerTitle,
    receipt.storeName,
    receipt.branchName,
    ...receipt.contactLines,
    "",
    ...metadataLines,
    "",
    "Items",
    ...itemLines,
    "",
    "Totals",
    ...totalLines,
    ...(noteLines.length > 0 ? ["", ...noteLines] : []),
    ...(receipt.footerLines.length > 0 ? ["", ...receipt.footerLines] : [])
  ]
    .filter(Boolean)
    .join("\n");
}
