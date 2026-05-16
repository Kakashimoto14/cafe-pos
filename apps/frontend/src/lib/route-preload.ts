const routeModules = {
  "/": () => import("@/pages/DashboardPage"),
  "/login": () => import("@/pages/LoginPage"),
  "/pos": () => import("@/pages/PosPage"),
  "/products": () => import("@/pages/ProductsPage"),
  "/orders": () => import("@/pages/OrdersPage"),
  "/inventory": () => import("@/pages/InventoryPage"),
  "/sales": () => import("@/pages/SalesPage"),
  "/discounts": () => import("@/pages/DiscountsPage"),
  "/team": () => import("@/pages/TeamPage"),
  "/settings": () => import("@/pages/SettingsPage"),
  "/receipt": () => import("@/pages/ReceiptPage")
} as const;

type RoutePath = keyof typeof routeModules;

export async function preloadRouteModule(path: string) {
  const loader = routeModules[path as RoutePath];

  if (!loader) {
    return;
  }

  await loader();
}

export async function preloadCoreRouteModules(paths: string[]) {
  await Promise.allSettled(paths.map((path) => preloadRouteModule(path)));
}

export const routeImporters = routeModules;
