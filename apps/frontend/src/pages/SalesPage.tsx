import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ReceiptText, Search, TrendingUp, Wallet, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function SalesPage() {
  const [from, setFrom] = useState(todayDate());
  const [to, setTo] = useState(todayDate());
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const salesQuery = useQuery({
    queryKey: ["sales", from, to],
    queryFn: () => apiClient.salesSummary({ from, to: `${to}T23:59:59` })
  });

  const filteredRecentOrders = useMemo(() => {
    const recentOrders = salesQuery.data?.recentOrders ?? [];
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return recentOrders;
    }

    return recentOrders.filter((order) =>
      [
        order.orderNumber,
        order.cashierName,
        order.paymentMethod,
        order.paymentReference ?? "",
        order.notes ?? "",
        ...order.items.map((item) => item.productName)
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, salesQuery.data?.recentOrders]);

  if (salesQuery.isLoading) {
    return <Card className="p-6 text-sm text-[#7b685c]">Loading sales summary...</Card>;
  }

  if (salesQuery.isError) {
    return <Card className="p-6 text-sm text-rose-500">{salesQuery.error.message}</Card>;
  }

  const summary = salesQuery.data;

  if (!summary) {
    return null;
  }

  const cards = [
    { label: "Sales total", value: formatMoney(summary.revenueTotal), icon: Wallet },
    { label: "Orders", value: `${summary.ordersCount}`, icon: ReceiptText },
    { label: "Average order", value: formatMoney(summary.averageOrderValue), icon: TrendingUp },
    { label: "Top items", value: `${summary.topItems.length}`, icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Sales intelligence</div>
            <h1 className="mt-3 font-display text-4xl text-[#241610]">Track daily cafe performance</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
              Review ticket volume, sales totals, and top-selling products without leaving the Cozy Cafe POS workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#5f4637]">From</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-12 w-full rounded-2xl bg-white px-4" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#5f4637]">To</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-12 w-full rounded-2xl bg-white px-4" />
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-[#eadbcb] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[#7b685c]">{card.label}</div>
              <card.icon className="h-4 w-4 text-[#9a8170]" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-[#241610]">{card.value}</div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Top sellers</div>
          <h2 className="mt-2 text-2xl font-semibold text-[#241610]">What is moving today</h2>
          <div className="mt-5 space-y-3">
            {summary.topItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                No sales have been recorded for this range yet.
              </div>
            ) : (
              summary.topItems.map((item, index) => (
                <div key={item.productName} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">#{index + 1}</div>
                      <div className="mt-1 font-semibold text-[#241610]">{item.productName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#241610]">{item.quantity} sold</div>
                      <div className="text-sm text-[#7b685c]">{formatMoney(item.revenue)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Recent transactions</div>
              <h2 className="mt-2 text-2xl font-semibold text-[#241610]">Latest completed tickets</h2>
            </div>
            <div className="flex items-center gap-3 rounded-[22px] border border-[#eadbcb] bg-white px-4 py-3 md:w-72">
              <Search className="h-4 w-4 text-[#9a8170]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tickets"
                className="w-full border-0 bg-transparent p-0 text-sm outline-none"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {filteredRecentOrders.map((order) => (
              <div key={order.id} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-[#241610]">{order.orderNumber}</div>
                    <div className="mt-1 text-sm text-[#7b685c]">
                      {order.cashierName} / {new Date(order.createdAt).toLocaleString("en-PH")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#241610]">{formatMoney(order.grandTotal)}</div>
                    <div className="mt-1 text-sm text-[#7b685c] uppercase">{order.paymentMethod}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <a
                    href={`/orders/${order.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#eadbcb] bg-[#f4ece2] px-4 text-sm font-semibold text-[#5b3a29] transition hover:bg-[#efe3d3]"
                  >
                    Print receipt
                  </a>
                </div>
              </div>
            ))}
            {summary.recentOrders.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                Orders completed from the POS will appear here as sales activity.
              </div>
            ) : null}
            {summary.recentOrders.length > 0 && filteredRecentOrders.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                No sales orders match that search.
              </div>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
