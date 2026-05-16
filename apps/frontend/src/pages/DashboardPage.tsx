import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Coffee, ReceiptText, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageErrorState, SectionCardSkeleton, StatCardsSkeleton } from "@/components/ui/page-states";
import { appQueryOptions } from "@/lib/app-queries";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

export function DashboardPage() {
  const summaryQuery = useQuery(appQueryOptions.dashboard());

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Cozy Cafe POS</div>
          <div className="mt-3 h-10 w-40 rounded-[18px] bg-[#f0e4d6]" />
        </section>
        <StatCardsSkeleton />
        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <SectionCardSkeleton rows={4} />
          <SectionCardSkeleton rows={4} />
        </section>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return <PageErrorState title="Dashboard unavailable" message={summaryQuery.error.message} onRetry={() => void summaryQuery.refetch()} />;
  }

  const summary = summaryQuery.data;

  if (!summary) {
    return null;
  }

  const metrics = [
    { label: "Revenue today", value: formatMoney(summary.revenueToday), detail: "Gross sales today", icon: Wallet },
    { label: "Orders today", value: `${summary.ordersToday}`, detail: "Closed tickets", icon: ReceiptText },
    { label: "Active products", value: `${summary.activeProducts}`, detail: "POS-ready items", icon: Coffee },
    { label: "Low stock", value: `${(summary.lowStockIngredients ?? []).length || summary.lowStockItems.length}`, detail: "Needs attention", icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
        <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Cozy Cafe POS</div>
        <h1 className="mt-3 font-display text-4xl text-[#241610]">Overview</h1>
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
          <h3 className="mt-2 text-2xl font-semibold text-[#241610]">Recent orders</h3>
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
            {(summary.lowStockIngredients ?? []).length === 0 && summary.lowStockItems.length === 0 ? (
              <div className="rounded-2xl bg-[#fffaf4] p-4 text-[#7b685c]">All tracked ingredients are comfortably stocked.</div>
            ) : (
              ((summary.lowStockIngredients ?? []).length > 0 ? summary.lowStockIngredients ?? [] : summary.lowStockItems).map((item) => (
                <div key={item.id} className="rounded-2xl border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="font-medium text-[#241610]">{item.name}</div>
                  <div className="mt-1 text-[#7b685c]">
                    {"quantityOnHand" in item
                      ? `${item.category} / ${item.quantityOnHand} ${item.unit} remaining`
                      : `${item.category} / ${item.stockQuantity} remaining`}
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
