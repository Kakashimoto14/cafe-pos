import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

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

export function OrdersPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.listOrders()
  });

  const orders = ordersQuery.data ?? [];
  const filteredOrders = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return orders;
    }

    return orders.filter((order) =>
      [
        order.orderNumber,
        order.orderType.replace("_", " "),
        order.paymentMethod,
        order.cashierName,
        order.paymentReference ?? "",
        order.notes ?? "",
        ...order.items.map((item) => item.productName)
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery, orders]);

  if (ordersQuery.isLoading) {
    return <Card className="p-6 text-sm text-[#7b685c]">Loading recent tickets...</Card>;
  }

  if (ordersQuery.isError) {
    return <Card className="p-6 text-sm text-rose-500">{ordersQuery.error.message}</Card>;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Orders</div>
          <h1 className="mt-3 font-display text-4xl text-[#241610]">Orders</h1>
        </div>
        <div className="flex w-full items-center gap-3 rounded-[24px] border border-[#eadbcb] bg-white px-4 py-3 shadow-[0_14px_28px_rgba(74,43,24,0.06)] md:max-w-md">
          <Search className="h-5 w-5 text-[#9a8170]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order, payment, cashier, or item"
            className="w-full border-0 bg-transparent p-0 text-sm outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      {orders.length === 0 ? (
        <Card className="grid min-h-72 place-items-center p-6 text-center">
          <div>
            <ReceiptText className="mx-auto h-8 w-8 text-[#b38d72]" />
            <h2 className="mt-4 text-xl font-semibold text-[#241610]">No orders yet</h2>
            <p className="mt-2 text-sm text-[#7b685c]">Orders created from the POS screen will appear here immediately.</p>
          </div>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="grid min-h-72 place-items-center p-6 text-center">
          <div>
            <ReceiptText className="mx-auto h-8 w-8 text-[#b38d72]" />
            <h2 className="mt-4 text-xl font-semibold text-[#241610]">No orders found</h2>
            <p className="mt-2 text-sm text-[#7b685c]">Try another order number, cashier, payment method, or item name.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-[#eadbcb] bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">{order.orderType.replace("_", " ")}</div>
                  <h2 className="mt-2 text-xl font-semibold text-[#241610]">{order.orderNumber}</h2>
                  {order.queueNumber ? (
                    <div className="mt-3 inline-flex rounded-full border border-[#d9c2ac] bg-[#fff7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a4a2e]">
                      Queue {order.queueNumber}
                    </div>
                  ) : null}
                  <p className="mt-1 text-sm text-[#7b685c]">{order.cashierName} / {new Date(order.createdAt).toLocaleString("en-PH")}</p>
                </div>
                <div className="rounded-2xl border border-[#eadbcb] bg-[#fffaf4] px-4 py-3 text-right text-[#241610]">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#8f7767]">{order.paymentMethod}</div>
                  <div className="mt-1 text-lg font-semibold">{formatMoney(order.grandTotal, order.receiptSettings?.currency)}</div>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-3xl border border-[#f0e4d6] bg-[#fffaf4] p-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium text-[#241610]">{item.productName}</div>
                      <div className="text-[#7b685c]">Qty {item.quantity}</div>
                      {item.addons && item.addons.length > 0 ? (
                        <div className="mt-1 space-y-0.5 text-xs text-[#7b685c]">
                          {item.addons.map((addon) => (
                            <div key={addon.id}>
                              + {addon.addonName}
                              {addon.quantity > 1 ? ` x${addon.quantity}` : ""}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right text-[#6c584b]">{formatMoney(item.lineTotal, order.receiptSettings?.currency)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#7b685c]">
                {order.discountTotal > 0 ? (
                  <span>
                    Discount: {order.discountLabel ?? order.discountCode ?? "Applied"} ({formatMoney(order.discountTotal, order.receiptSettings?.currency)})
                  </span>
                ) : null}
                {order.paymentReference ? <span>Reference: {order.paymentReference}</span> : null}
              </div>

              {order.notes ? <p className="mt-4 text-sm text-[#7b685c]">Note: {order.notes}</p> : null}
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
