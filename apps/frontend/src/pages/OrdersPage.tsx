import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PaginationControls, PageEmptyState, PageErrorState, SectionCardSkeleton } from "@/components/ui/page-states";
import { appQueryOptions, DEFAULT_ORDERS_PAGE_SIZE } from "@/lib/app-queries";

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
  const [page, setPage] = useState(1);
  const limit = DEFAULT_ORDERS_PAGE_SIZE;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const ordersQuery = useQuery(
    appQueryOptions.orders({
      page,
      limit,
      search: debouncedQuery || undefined
    })
  );

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;

  if (ordersQuery.isLoading && orders.length === 0) {
    return <SectionCardSkeleton rows={4} />;
  }

  if (ordersQuery.isError) {
    return <PageErrorState title="Orders unavailable" message={ordersQuery.error.message} onRetry={() => void ordersQuery.refetch()} />;
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
            placeholder="Search order, queue, payment, email, reference, or note"
            className="w-full border-0 bg-transparent p-0 text-sm outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-[#8f7767] hover:bg-[#f6eee5]">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>

      {ordersQuery.isFetching && orders.length > 0 ? (
        <div className="text-sm text-[#8f7767]">Refreshing recent tickets in the background...</div>
      ) : null}

      {orders.length === 0 ? (
        <PageEmptyState
          icon={<ReceiptText className="h-8 w-8" />}
          title={debouncedQuery ? "No matching orders found." : "No orders yet"}
          description={
            debouncedQuery
              ? "Try another order number, queue number, payment method, customer email, payment reference, or note."
              : "Orders created from the POS screen will appear here immediately."
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {orders.map((order) => (
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
                  <div className="mt-1 text-lg font-semibold">{formatMoney(order.grandTotal)}</div>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-3xl border border-[#f0e4d6] bg-[#fffaf4] p-4">
                {order.items.length === 0 ? (
                  <div className="text-sm text-[#7b685c]">No line items were recorded for this order.</div>
                ) : (
                  order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium text-[#241610]">{item.productName}</div>
                        <div className="text-[#7b685c]">Qty {item.quantity}</div>
                      </div>
                      <div className="text-right text-[#6c584b]">{formatMoney(item.lineTotal)}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#7b685c]">
                {order.discountTotal > 0 ? (
                  <span>
                    Discount: Applied ({formatMoney(order.discountTotal)})
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

      <PaginationControls
        page={meta?.page ?? page}
        totalPages={meta?.totalPages ?? 0}
        label={meta ? `Page ${meta.page}${meta.totalPages > meta.page ? " / more available" : ""}` : undefined}
        onPageChange={setPage}
      />
    </div>
  );
}
