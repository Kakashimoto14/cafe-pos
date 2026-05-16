import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import type { AppRole } from "@cafe/shared-types";
import { preloadRouteModule } from "@/lib/route-preload";
import { sidebarDataClient } from "@/services/sidebar-data";

type ListParams = {
  page: number;
  limit: number;
  search?: string;
};

type SalesRange = {
  from: string;
  to: string;
};

export const DEFAULT_ORDERS_PAGE_SIZE = 20;
export const DEFAULT_SALES_PAGE_SIZE = 20;

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDefaultSalesDateRange(referenceDate = new Date(), lookbackDays = 29): SalesRange {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - lookbackDays);

  return {
    from: formatDateInput(start),
    to: formatDateInput(end)
  };
}

export function toInclusiveDateTime(value: string) {
  return `${value}T23:59:59`;
}

export const appQueryKeys = {
  dashboard: ["dashboard"] as const,
  orders: (page: number, limit: number, search = "") => ["orders", page, limit, search] as const,
  products: (params: ListParams) => ["products", params] as const,
  inventory: (params: ListParams) => ["inventory", params] as const,
  salesSummary: (from: string, to: string) => ["sales-summary", from, to] as const,
  salesOrders: (page: number, limit: number, search: string, from: string, to: string) => ["sales-transactions", page, limit, search, from, to] as const,
  discounts: (params: ListParams & { activeOnly?: boolean }) => ["discounts", params] as const,
  team: (params: ListParams) => ["team", params] as const,
  settings: ["settings"] as const
};

export const appQueryOptions = {
  dashboard: () =>
    queryOptions({
      queryKey: appQueryKeys.dashboard,
      queryFn: () => sidebarDataClient.getDashboardSummary(),
      staleTime: 60_000
    }),
  orders: (params: ListParams) =>
    queryOptions({
      queryKey: appQueryKeys.orders(params.page, params.limit, params.search ?? ""),
      queryFn: () => sidebarDataClient.getOrdersPage(params),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
      retry: false
    }),
  products: (params: ListParams) =>
    queryOptions({
      queryKey: appQueryKeys.products(params),
      queryFn: () => sidebarDataClient.getProductsPage(params),
      placeholderData: keepPreviousData,
      staleTime: 60_000
    }),
  inventory: (params: ListParams) =>
    queryOptions({
      queryKey: appQueryKeys.inventory(params),
      queryFn: () => sidebarDataClient.getInventoryPage(params),
      placeholderData: keepPreviousData,
      staleTime: 60_000
    }),
  salesSummary: (range: SalesRange) =>
    queryOptions({
      queryKey: appQueryKeys.salesSummary(range.from, range.to),
      queryFn: () => sidebarDataClient.getSalesSummary(range),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
      retry: false
    }),
  salesOrders: (params: ListParams & SalesRange) =>
    queryOptions({
      queryKey: appQueryKeys.salesOrders(params.page, params.limit, params.search ?? "", params.from, params.to),
      queryFn: () =>
        sidebarDataClient.getSalesOrdersPage({
          ...params,
          dateFrom: params.from,
          dateTo: params.to
        }),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
      retry: false
    }),
  discounts: (params: ListParams & { activeOnly?: boolean }) =>
    queryOptions({
      queryKey: appQueryKeys.discounts(params),
      queryFn: () => sidebarDataClient.getDiscountsPage(params),
      placeholderData: keepPreviousData,
      staleTime: 60_000
    }),
  team: (params: ListParams) =>
    queryOptions({
      queryKey: appQueryKeys.team(params),
      queryFn: () => sidebarDataClient.getTeamPage(params),
      placeholderData: keepPreviousData,
      staleTime: 60_000
    }),
  settings: () =>
    queryOptions({
      queryKey: appQueryKeys.settings,
      queryFn: () => sidebarDataClient.getSettings(),
      staleTime: 5 * 60_000
    })
};

export type AppQueryOptions = typeof appQueryOptions;

function scheduleIdleWork(task: () => void, delay = 600) {
  if (typeof window === "undefined") {
    return;
  }

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(task, { timeout: 2_000 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = globalThis.setTimeout(task, delay);
  return () => globalThis.clearTimeout(timeoutId);
}

export function prefetchPostLoginData(queryClient: QueryClient) {
  void queryClient;
  return scheduleIdleWork(() => undefined);
}

export async function prefetchSidebarTarget(queryClient: QueryClient, path: string, role?: AppRole) {
  await preloadRouteModule(path);
  void queryClient;
  void path;
  void role;
}
