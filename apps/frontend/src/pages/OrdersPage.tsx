import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

export function OrdersPage() {
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient.listOrders()
  });

  if (ordersQuery.isLoading) {
    return <Card className="p-6 text-sm text-[#7b685c]">Loading recent tickets...</Card>;
  }

  if (ordersQuery.isError) {
    return <Card className="p-6 text-sm text-rose-500">{ordersQuery.error.message}</Card>;
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Sales history</div>
          <h1 className="mt-3 font-display text-4xl text-[#241610]">Recent orders</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
            Cashiers see their own tickets. Managers and admins can review the whole floor.
          </p>
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
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id} className="border-[#eadbcb] bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">{order.orderType.replace("_", " ")}</div>
                  <h2 className="mt-2 text-xl font-semibold text-[#241610]">{order.orderNumber}</h2>
                  <p className="mt-1 text-sm text-[#7b685c]">{order.cashierName} / {new Date(order.createdAt).toLocaleString("en-PH")}</p>
                </div>
                <div className="rounded-2xl border border-[#eadbcb] bg-[#fffaf4] px-4 py-3 text-right text-[#241610]">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#8f7767]">{order.paymentMethod}</div>
                  <div className="mt-1 text-lg font-semibold">{formatMoney(order.grandTotal)}</div>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-3xl border border-[#f0e4d6] bg-[#fffaf4] p-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium text-[#241610]">{item.productName}</div>
                      <div className="text-[#7b685c]">Qty {item.quantity}</div>
                    </div>
                    <div className="text-right text-[#6c584b]">{formatMoney(item.lineTotal)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#7b685c]">
                {order.discountTotal > 0 ? (
                  <span>
                    Discount: {order.discountLabel ?? order.discountCode ?? "Applied"} ({formatMoney(order.discountTotal)})
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
