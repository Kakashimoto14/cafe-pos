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
    return <Card className="p-6 text-sm text-[#7b685c]">Loading live dashboard...</Card>;
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
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Cozy Cafe POS</div>
        <h1 className="mt-3 font-display text-4xl text-[#241610]">A clearer view of today&apos;s floor</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
          Track sales, watch low-stock items, and keep your service team aligned from one calm operations dashboard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[#7b685c]">{metric.label}</div>
              <metric.icon className="h-4 w-4 text-[#9a8170]" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-[#241610]">{metric.value}</div>
            <div className="mt-2 text-sm text-[#7b685c]">{metric.detail}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-[#eadbcb] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Latest tickets</div>
          <h3 className="mt-2 text-2xl font-semibold text-[#241610]">Front counter pulse</h3>
          <div className="mt-5 space-y-3">
            {summary.recentOrders.length === 0 ? (
              <div className="rounded-2xl bg-[#fffaf4] p-4 text-sm text-[#7b685c]">No tickets have been created yet.</div>
            ) : (
              summary.recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#241610]">{order.orderNumber}</div>
                      <div className="text-sm text-[#7b685c]">{order.cashierName} / {order.paymentMethod}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#241610]">{formatMoney(order.grandTotal)}</div>
                      <div className="text-sm text-[#7b685c]">{new Date(order.createdAt).toLocaleTimeString("en-PH")}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-[#eadbcb] bg-white p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Stock watch</div>
          <h3 className="mt-2 text-2xl font-semibold text-[#241610]">Low inventory list</h3>
          <div className="mt-4 space-y-3 text-sm text-[#7b685c]">
            {summary.lowStockItems.length === 0 ? (
              <div className="rounded-2xl bg-[#fffaf4] p-4 text-[#7b685c]">All active menu items are comfortably stocked.</div>
            ) : (
              summary.lowStockItems.map((product) => (
                <div key={product.id} className="rounded-2xl border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="font-medium text-[#241610]">{product.name}</div>
                  <div className="mt-1 text-[#7b685c]">{product.category} / {product.stockQuantity} remaining</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
