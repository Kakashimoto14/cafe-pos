import type { CafeSettings, OrderListItem, PaymentProvider } from "@cafe/shared-types";
import { formatOrderChannelLabel, getBrandLogoUrl, getReceiptTitle, mergeReceiptSnapshotWithSettings, safeTrim } from "@/lib/cafe-settings";

type ReceiptRow = {
  label: string;
  value: string;
  emphasis?: "highlight" | "total";
};

type ReceiptItemRow = {
  id: string;
  productName: string;
  quantityLabel: string;
  totalLabel: string;
  addons: string[];
};

export type ReceiptViewModel = {
  settings: CafeSettings;
  headerTitle: string;
  logoUrl: string;
  contactLines: string[];
  metadataRows: ReceiptRow[];
  itemRows: ReceiptItemRow[];
  totalRows: ReceiptRow[];
  orderNoteRows: ReceiptRow[];
  footerLines: string[];
};

function formatPaymentMethodLabel(method: PaymentProvider) {
  switch (method) {
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

export function formatReceiptCurrency(value: number, currency = "PHP") {
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

export function formatReceiptDate(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function createSampleReceiptData(settings?: Partial<CafeSettings> | null, cashierName = "Cafe Cashier"): OrderListItem {
  const resolvedSettings = mergeReceiptSnapshotWithSettings(undefined, settings);
  const subtotal = 135;
  const taxTotal = Number((subtotal * (resolvedSettings.taxRate / 100)).toFixed(2));
  const grandTotal = Number((subtotal + taxTotal).toFixed(2));

  return {
    id: "preview-receipt",
    orderNumber: "ORD-20260514-AB12",
    queueNumber: "Q014",
    receiptSettings: resolvedSettings,
    orderType: resolvedSettings.defaultOrderType,
    paymentMethod: "cash",
    cashierName,
    subtotal,
    discountTotal: 0,
    taxTotal,
    grandTotal,
    amountPaid: grandTotal,
    changeDue: 0,
    createdAt: "2026-05-14T02:38:50.000+08:00",
    items: [
      {
        id: "preview-item-americano",
        productId: "preview-product-americano",
        productName: "Americano",
        quantity: 1,
        unitPrice: subtotal,
        lineTotal: subtotal,
        addons: []
      }
    ]
  };
}

export function buildReceiptViewModel({
  order,
  settings
}: {
  order: OrderListItem;
  settings?: Partial<CafeSettings> | null;
}): ReceiptViewModel {
  const resolvedSettings = mergeReceiptSnapshotWithSettings(order.receiptSettings, settings);
  const currency = resolvedSettings.currency;
  const contactLines = [resolvedSettings.address, resolvedSettings.contactNumber, resolvedSettings.email, resolvedSettings.businessInfo]
    .map((value) => safeTrim(value))
    .filter(Boolean);
  const metadataRows: ReceiptRow[] = [];

  if (resolvedSettings.showOrderNumber && order.orderNumber) {
    metadataRows.push({ label: "Order", value: order.orderNumber });
  }

  if (resolvedSettings.showQueueNumber && order.queueNumber) {
    metadataRows.push({ label: "Queue", value: order.queueNumber, emphasis: "highlight" });
  }

  const cashierName = safeTrim(order.cashierName);

  if (resolvedSettings.showCashierName && cashierName) {
    metadataRows.push({ label: "Cashier", value: cashierName });
  }

  metadataRows.push(
    { label: "Date", value: formatReceiptDate(order.createdAt) },
    { label: "Order type", value: formatOrderChannelLabel(order.orderType) },
    { label: "Payment", value: formatPaymentMethodLabel(order.paymentMethod) }
  );

  const paymentReference = safeTrim(order.paymentReference);

  if (paymentReference) {
    metadataRows.push({ label: "Reference", value: paymentReference });
  }

  const itemRows = order.items.map((item) => ({
    id: item.id,
    productName: item.productName,
    quantityLabel: `${item.quantity} x ${formatReceiptCurrency(item.unitPrice, currency)}`,
    totalLabel: formatReceiptCurrency(item.lineTotal, currency),
    addons:
      item.addons?.map((addon) => {
        const addonQuantity = addon.quantity > 1 ? ` x${addon.quantity}` : "";
        return `+ ${addon.addonName}${addonQuantity} / ${formatReceiptCurrency(addon.priceDelta * addon.quantity, currency)}`;
      }) ?? []
  }));

  const totalRows: ReceiptRow[] = [
    { label: "Subtotal", value: formatReceiptCurrency(order.subtotal, currency) }
  ];

  if (order.discountTotal > 0) {
    totalRows.push({
      label: order.discountLabel ? `Discount (${order.discountLabel})` : "Discount",
      value: `-${formatReceiptCurrency(order.discountTotal, currency)}`
    });
  }

  totalRows.push(
    {
      label: resolvedSettings.taxRate > 0 ? `${resolvedSettings.taxLabel} ${resolvedSettings.taxRate}%` : resolvedSettings.taxLabel,
      value: formatReceiptCurrency(order.taxTotal, currency)
    },
    { label: "Total", value: formatReceiptCurrency(order.grandTotal, currency), emphasis: "total" },
    { label: "Amount paid", value: formatReceiptCurrency(order.amountPaid, currency) },
    { label: "Change", value: formatReceiptCurrency(order.changeDue, currency) }
  );

  const orderNoteRows: ReceiptRow[] = [];

  const orderNotes = safeTrim(order.notes);

  if (orderNotes) {
    orderNoteRows.push({ label: "Order note", value: orderNotes });
  }

  const paymentNotes = safeTrim(order.paymentNotes);

  if (paymentNotes) {
    orderNoteRows.push({ label: "Payment note", value: paymentNotes });
  }

  return {
    settings: resolvedSettings,
    headerTitle: getReceiptTitle(resolvedSettings),
    logoUrl: getBrandLogoUrl(resolvedSettings),
    contactLines,
    metadataRows,
    itemRows,
    totalRows,
    orderNoteRows,
    footerLines: [safeTrim(resolvedSettings.receiptNotes), safeTrim(resolvedSettings.receiptFooter)].filter(Boolean)
  };
}
