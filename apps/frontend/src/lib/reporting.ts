import type { CafeSettings, IngredientRecord, SalesSummary } from "@cafe/shared-types";
import { mergeCafeSettings } from "@/lib/cafe-settings";

function escapeCsvValue(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function buildCsvLine(values: Array<string | number | null | undefined>) {
  return values.map(escapeCsvValue).join(",");
}

function createCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatReportMoney(value: number, currency = "PHP") {
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

export function downloadSalesReportCsv({
  settings,
  summary,
  from,
  to
}: {
  settings?: CafeSettings;
  summary: SalesSummary;
  from: string;
  to: string;
}) {
  const resolvedSettings = mergeCafeSettings(settings);
  const generatedAt = new Date();
  const bestSeller = summary.topItems[0]?.productName ?? "No sales recorded";
  const rows = [
    [resolvedSettings.storeName],
    [resolvedSettings.branchName],
    [resolvedSettings.address],
    [[resolvedSettings.contactNumber, resolvedSettings.email].filter(Boolean).join(" / ")],
    [],
    ["Sales Report"],
    [`Generated At`, generatedAt.toLocaleString("en-PH")],
    ["Date Range", `${from} to ${to}`],
    [],
    ["Summary"],
    ["Total Sales", formatReportMoney(summary.revenueTotal, resolvedSettings.currency)],
    ["Total Orders", summary.ordersCount],
    ["Average Order Value", formatReportMoney(summary.averageOrderValue, resolvedSettings.currency)],
    ["Best-Selling Product", bestSeller],
    [],
    ["Payment Breakdown"],
    ["Method", "Orders", "Revenue"],
    ...summary.paymentBreakdown.map((row) => [row.method.toUpperCase(), row.orders, formatReportMoney(row.revenue, resolvedSettings.currency)]),
    [],
    ["Detailed Sales"],
    ["Order Number", "Queue Number", "Date", "Cashier", "Order Type", "Payment Method", "Total", "Customer Email", "Items"],
    ...summary.orders.map((order) => [
      order.orderNumber,
      order.queueNumber ?? "",
      new Date(order.createdAt).toLocaleString("en-PH"),
      order.cashierName,
      order.orderType.replace("_", " "),
      order.paymentMethod.toUpperCase(),
      formatReportMoney(order.grandTotal, resolvedSettings.currency),
      order.customerEmail ?? "",
      order.items.map((item) => `${item.productName} x${item.quantity}`).join(" | ")
    ])
  ];

  createCsvFile(`sales-report-${from}-to-${to}.csv`, rows.map((row) => buildCsvLine(row)).join("\n"));
}

export function downloadInventoryReportCsv({
  settings,
  items,
  selectedCategory,
  selectedStatus
}: {
  settings?: CafeSettings;
  items: IngredientRecord[];
  selectedCategory: string;
  selectedStatus: string;
}) {
  const resolvedSettings = mergeCafeSettings(settings);
  const generatedAt = new Date();
  const totalValue = items.reduce((sum, item) => sum + item.quantityOnHand * item.costPerUnit, 0);
  const lowStockCount = items.filter((item) => item.isActive && item.quantityOnHand <= item.lowStockThreshold && item.quantityOnHand > 0).length;
  const outOfStockCount = items.filter((item) => item.isActive && item.quantityOnHand <= 0).length;

  const rows = [
    [resolvedSettings.storeName],
    [resolvedSettings.branchName],
    [resolvedSettings.address],
    [[resolvedSettings.contactNumber, resolvedSettings.email].filter(Boolean).join(" / ")],
    [],
    ["Inventory Report"],
    [`Generated At`, generatedAt.toLocaleString("en-PH")],
    ["Category Filter", selectedCategory === "all" ? "All categories" : selectedCategory],
    ["Status Filter", selectedStatus === "all" ? "All statuses" : selectedStatus],
    [],
    ["Summary"],
    ["Total Ingredients / Items", items.length],
    ["Low Stock Count", lowStockCount],
    ["Out of Stock Count", outOfStockCount],
    ["Estimated Inventory Value", formatReportMoney(totalValue, resolvedSettings.currency)],
    [],
    ["Detailed Inventory"],
    ["Item Name", "Category", "Current Stock", "Unit", "Low Stock Threshold", "Status", "Last Updated"],
    ...items.map((item) => {
      const status = !item.isActive ? "Inactive" : item.quantityOnHand <= 0 ? "Out of Stock" : item.quantityOnHand <= item.lowStockThreshold ? "Low Stock" : "In Stock";
      return [item.name, item.category, item.quantityOnHand, item.unit, item.lowStockThreshold, status, item.updatedAt ? new Date(item.updatedAt).toLocaleString("en-PH") : ""];
    })
  ];

  createCsvFile(`inventory-report-${selectedCategory}-${selectedStatus}.csv`, rows.map((row) => buildCsvLine(row)).join("\n"));
}
