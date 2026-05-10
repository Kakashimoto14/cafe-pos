import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Coffee, ReceiptText, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiClient.dashboardSummary()
  });

  if (summaryQuery.isLoading) {
    return <Card className="p-6 text-sm text-slate-500">Loading live dashboard...</Card>;
  }

  if (summaryQuery.isError) {
    return <Card className="p-6 text-sm text-rose-500">{summaryQuery.error.message}</Card>;
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return null;
  }

  const metrics = [
    { label: "Revenue today", value: formatMoney(summary.revenueToday), detail: "Gross sales booked this calendar day", icon: Wallet },
    { label: "Orders today", value: `${summary.ordersToday}`, detail: "Tickets closed across active terminals", icon: ReceiptText },
    { label: "Active products", value: `${summary.activeProducts}`, detail: "Items available to the POS grid", icon: Coffee },
    { label: "Low stock", value: `${summary.lowStockItems.length}`, detail: "Products below the stock watch threshold", icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-500">{metric.label}</div>
              <metric.icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-slate-950">{metric.value}</div>
            <div className="mt-2 text-sm text-slate-500">{metric.detail}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Latest tickets</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Front counter pulse</h3>
          <div className="mt-5 space-y-3">
            {summary.recentOrders.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No tickets have been created yet.</div>
            ) : (
              summary.recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{order.orderNumber}</div>
                      <div className="text-sm text-slate-500">
                        {order.cashierName} • {order.paymentMethod}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-950">{formatMoney(order.grandTotal)}</div>
                      <div className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleTimeString("en-PH")}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stock watch</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Low inventory list</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            {summary.lowStockItems.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">All active menu items are comfortably stocked.</div>
            ) : (
              summary.lowStockItems.map((product) => (
                <div key={product.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="font-medium text-slate-900">{product.name}</div>
                  <div className="mt-1 text-slate-500">
                    {product.category} • {product.stockQuantity} remaining
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
