import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, LineChart, Printer, ReceiptText, Search, TrendingUp, Wallet, X } from "lucide-react";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { Card } from "@/components/ui/card";
import { PaginationControls, PageErrorState, StatCardsSkeleton, TableSkeleton } from "@/components/ui/page-states";
import { useCafeSettings } from "@/hooks/use-cafe-settings";
import { appQueryOptions, DEFAULT_SALES_PAGE_SIZE, getDefaultSalesDateRange, toInclusiveDateTime } from "@/lib/app-queries";
import { getBrandLogoUrl } from "@/lib/cafe-settings";
import { downloadSalesReportCsv, formatReportMoney } from "@/lib/reporting";

export function SalesPage() {
  const defaultDateRange = useMemo(() => getDefaultSalesDateRange(), []);
  const [from, setFrom] = useState(defaultDateRange.from);
  const [to, setTo] = useState(defaultDateRange.to);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const settingsQuery = useCafeSettings();
  const limit = DEFAULT_SALES_PAGE_SIZE;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, from, to]);

  const rangeEnd = toInclusiveDateTime(to);
  const salesQuery = useQuery(appQueryOptions.salesSummary({ from, to: rangeEnd }));
  const salesOrdersQuery = useQuery(
    appQueryOptions.salesOrders({
      page,
      limit,
      search: debouncedQuery || undefined,
      from,
      to: rangeEnd
    })
  );

  const currency = settingsQuery.data?.currency ?? "PHP";
  const summary = salesQuery.data;
  const generatedAt = useMemo(() => new Date(), [from, to, summary?.ordersCount, summary?.revenueTotal]);

  if (salesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)]">
          <div className="h-4 w-24 rounded-[18px] bg-[#eadccc]" />
          <div className="mt-4 h-10 w-56 rounded-[18px] bg-[#f0e4d6]" />
        </section>
        <StatCardsSkeleton />
        <TableSkeleton rows={6} columns={6} />
      </div>
    );
  }

  if (salesQuery.isError) {
    return <PageErrorState title="Sales unavailable" message={salesQuery.error.message} onRetry={() => void salesQuery.refetch()} />;
  }

  if (!summary) {
    return (
      <PageErrorState
        title="Sales summary unavailable"
        message="The sales summary did not return any data for this request."
        onRetry={() => void salesQuery.refetch()}
      />
    );
  }

  const salesByDay = summary.salesByDay;
  const topItems = summary.topItems;
  const paymentBreakdown = summary.paymentBreakdown;
  const categoryBreakdown = summary.categoryBreakdown;
  const ordersCount = summary.ordersCount;
  const hasActiveSearch = debouncedQuery.length > 0;
  const transactionRows = salesOrdersQuery.data?.data ?? [];
  const bestSeller = summary.topItems[0];
  const maxSalesDayRevenue = Math.max(...salesByDay.map((point) => point.revenue), 0);
  const maxTopItemRevenue = Math.max(...topItems.map((item) => item.revenue), 0);
  const maxCategoryRevenue = Math.max(...categoryBreakdown.map((item) => item.revenue), 0);
  const salesListMessage = salesOrdersQuery.isError
    ? salesOrdersQuery.error.message
    : hasActiveSearch
      ? "No matching sales transaction found."
      : "No completed sales yet.";
  const cards = [
    { label: "Total sales", value: formatReportMoney(summary.revenueTotal, currency), icon: Wallet },
    { label: "Total orders", value: `${ordersCount}`, icon: ReceiptText },
    { label: "Average order", value: formatReportMoney(summary.averageOrderValue, currency), icon: TrendingUp },
    { label: "Best seller", value: bestSeller?.productName ?? "No sales yet", icon: BarChart3 }
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      <section className="rounded-[32px] border border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f6eee5)] p-6 shadow-[0_22px_48px_rgba(74,43,24,0.08)] print:border-none print:bg-white print:p-0 print:shadow-none">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <BrandLogo src={getBrandLogoUrl(settingsQuery.data)} alt={`${settingsQuery.data?.storeName ?? "Cafe"} logo`} className="hidden h-16 rounded-2xl border border-[#eadbcb] bg-white p-2 sm:block print:block" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8f7767]">Reports</div>
              <h1 className="mt-3 font-display text-4xl text-[#241610]">Sales Report</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
                {settingsQuery.data?.storeName ?? "Cafe POS"} performance overview with branded export-ready reporting, analytics, and print output.
              </p>
              <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[#8f7767]">Generated {generatedAt.toLocaleString("en-PH")}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] print:hidden">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#5f4637]">From</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-12 w-full rounded-2xl bg-white px-4" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#5f4637]">To</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-12 w-full rounded-2xl bg-white px-4" />
            </label>
            <button
              type="button"
              onClick={() => downloadSalesReportCsv({ settings: settingsQuery.data ?? undefined, summary, from, to })}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#eadbcb] bg-white px-4 text-sm font-semibold text-[#5b3a29] transition hover:bg-[#f8f1e8]"
            >
              <Download className="mr-2 h-4 w-4" />
              Download report
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_18px_32px_rgba(122,74,46,0.18)] transition hover:bg-[#6e4228]"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print report
            </button>
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

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
              <LineChart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Sales over time</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Daily revenue trend</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {salesByDay.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                No completed sales match the selected date range yet.
              </div>
            ) : (
              salesByDay.map((point) => (
                <div key={point.date} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[#241610]">{point.label}</span>
                    <span className="text-[#7b685c]">
                      {formatReportMoney(point.revenue, currency)} / {point.orders} orders
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#f3e7d8]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#7a4a2e,#c08a5a)]" style={{ width: `${maxSalesDayRevenue === 0 ? 0 : Math.max((point.revenue / maxSalesDayRevenue) * 100, 8)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Top sellers</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Best-selling items</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {topItems.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                Top products will appear after the first completed sale in this date range.
              </div>
            ) : (
              topItems.map((item, index) => (
                <div key={item.productName} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">#{index + 1}</div>
                      <div className="mt-1 font-semibold text-[#241610]">{item.productName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#241610]">{item.quantity} sold</div>
                      <div className="text-sm text-[#7b685c]">{formatReportMoney(item.revenue, currency)}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#7a4a2e]" style={{ width: `${maxTopItemRevenue === 0 ? 0 : Math.max((item.revenue / maxTopItemRevenue) * 100, 8)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Payment methods</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Payment breakdown</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {paymentBreakdown.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                Payment method analytics will appear after orders are completed.
              </div>
            ) : (
              paymentBreakdown.map((item) => (
                <div key={item.method} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7767]">{item.method}</div>
                  <div className="mt-3 text-xl font-semibold text-[#241610]">{formatReportMoney(item.revenue, currency)}</div>
                  <div className="mt-1 text-sm text-[#7b685c]">{item.orders} orders</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-[#eadbcb] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Category mix</div>
              <h2 className="mt-1 text-2xl font-semibold text-[#241610]">Sales by category</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {categoryBreakdown.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
                Category analytics will appear once products with categories are sold.
              </div>
            ) : (
              categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[#241610]">{item.category}</span>
                    <span className="text-[#7b685c]">
                      {item.quantity} sold / {formatReportMoney(item.revenue, currency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f3e7d8]">
                    <div className="h-full rounded-full bg-[#c08a5a]" style={{ width: `${maxCategoryRevenue === 0 ? 0 : Math.max((item.revenue / maxCategoryRevenue) * 100, 10)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <Card className="border-[#eadbcb] bg-white p-5 print:border-none print:p-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Detailed sales</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#241610]">Transactions</h2>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] border border-[#eadbcb] bg-white px-4 py-3 md:w-80">
            <Search className="h-4 w-4 text-[#9a8170]" />
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
        </div>

        {salesOrdersQuery.isFetching && (salesOrdersQuery.data?.data.length ?? 0) > 0 ? (
          <div className="mt-4 text-sm text-[#8f7767] print:hidden">Refreshing transactions in the background...</div>
        ) : null}

        {ordersCount === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
            Orders completed from the POS will populate this report automatically.
          </div>
        ) : salesOrdersQuery.isLoading && !salesOrdersQuery.data ? (
          <div className="mt-5">
            <TableSkeleton rows={6} columns={6} />
          </div>
        ) : salesOrdersQuery.isError ? (
          <div className="mt-5">
            <PageErrorState title="Transaction list unavailable" message={salesOrdersQuery.error.message} onRetry={() => void salesOrdersQuery.refetch()} />
          </div>
        ) : transactionRows.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-6 text-sm text-[#7b685c]">
            {salesListMessage}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[24px] border border-[#f0e4d6] print:overflow-visible">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#fffaf4] text-[#5f4637]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Queue</th>
                  <th className="px-4 py-3 font-semibold">Cashier</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {transactionRows.map((order) => (
                  <tr key={order.id} className="border-t border-[#f0e4d6] align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#241610]">{order.orderNumber}</div>
                      <div className="mt-1 text-xs text-[#8f7767]">{new Date(order.createdAt).toLocaleString("en-PH")}</div>
                    </td>
                    <td className="px-4 py-4">
                      {order.queueNumber ? (
                        <span className="rounded-full border border-[#d9c2ac] bg-[#fff7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a4a2e]">
                          {order.queueNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-[#8f7767]">Legacy</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-[#241610]">{order.cashierName}</div>
                      <div className="mt-1 text-xs text-[#8f7767]">{order.customerEmail ?? "No customer email"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium uppercase text-[#241610]">{order.paymentMethod}</div>
                      <div className="mt-1 text-xs text-[#8f7767]">{order.paymentReference ?? "No reference"}</div>
                    </td>
                    <td className="px-4 py-4">
                      {order.items.length === 0 ? (
                        <div className="text-[#8f7767]">No items recorded</div>
                      ) : (
                        <div className="space-y-1 text-[#6c584b]">
                          {order.items.map((item) => (
                            <div key={item.id}>
                              {item.productName} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#241610]">{formatReportMoney(order.grandTotal, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 print:hidden">
          <PaginationControls
            page={salesOrdersQuery.data?.meta.page ?? page}
            totalPages={salesOrdersQuery.data?.meta.totalPages ?? 0}
            label={salesOrdersQuery.data ? `Page ${salesOrdersQuery.data.meta.page}${salesOrdersQuery.data.meta.totalPages > salesOrdersQuery.data.meta.page ? " / more available" : ""}` : undefined}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <div className="hidden text-center text-xs uppercase tracking-[0.18em] text-[#8f7767] print:block">
        Sales report generated on {generatedAt.toLocaleString("en-PH")}
      </div>
    </div>
  );
}
