import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { routeImporters } from "@/lib/route-preload";
import { AppShell } from "@/layouts/AppShell";
import { RequireAuth } from "@/router/RequireAuth";
import { RequireRole } from "@/router/RequireRole";
import { RouteErrorBoundary } from "@/router/RouteErrorBoundary";

const DashboardPage = lazy(async () => ({
  default: (await routeImporters["/"]()).DashboardPage
}));

const LoginPage = lazy(async () => ({
  default: (await routeImporters["/login"]()).LoginPage
}));

const PosPage = lazy(async () => ({
  default: (await routeImporters["/pos"]()).PosPage
}));

const ProductsPage = lazy(async () => ({
  default: (await routeImporters["/products"]()).ProductsPage
}));

const OrdersPage = lazy(async () => ({
  default: (await routeImporters["/orders"]()).OrdersPage
}));

const InventoryPage = lazy(async () => ({
  default: (await routeImporters["/inventory"]()).InventoryPage
}));

const SalesPage = lazy(async () => ({
  default: (await routeImporters["/sales"]()).SalesPage
}));

const DiscountsPage = lazy(async () => ({
  default: (await routeImporters["/discounts"]()).DiscountsPage
}));

const TeamPage = lazy(async () => ({
  default: (await routeImporters["/team"]()).TeamPage
}));

const ReceiptPage = lazy(async () => ({
  default: (await routeImporters["/receipt"]()).ReceiptPage
}));

const SettingsPage = lazy(async () => ({
  default: (await routeImporters["/settings"]()).SettingsPage
}));

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "pos", element: <PosPage /> },
          { path: "products", element: <ProductsPage /> },
          { path: "orders", element: <OrdersPage /> },
          {
            path: "inventory",
            element: (
              <RequireRole allowedRoles={["admin", "manager"]}>
                <InventoryPage />
              </RequireRole>
            )
          },
          {
            path: "sales",
            element: (
              <RequireRole allowedRoles={["admin", "manager"]}>
                <SalesPage />
              </RequireRole>
            )
          },
          {
            path: "discounts",
            element: (
              <RequireRole allowedRoles={["admin", "manager"]}>
                <DiscountsPage />
              </RequireRole>
            )
          },
          {
            path: "team",
            element: (
              <RequireRole allowedRoles={["admin"]}>
                <TeamPage />
              </RequireRole>
            )
          },
          { path: "settings", element: <SettingsPage /> }
        ]
      },
      {
        path: "orders/:orderId/receipt",
        element: <ReceiptPage />
      }
    ]
  }
]);
