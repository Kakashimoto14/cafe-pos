import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { RequireAuth } from "@/router/RequireAuth";
import { RequireRole } from "@/router/RequireRole";
import { RouteErrorBoundary } from "@/router/RouteErrorBoundary";

const DashboardPage = lazy(async () => ({
  default: (await import("@/pages/DashboardPage")).DashboardPage
}));

const LoginPage = lazy(async () => ({
  default: (await import("@/pages/LoginPage")).LoginPage
}));

const PosPage = lazy(async () => ({
  default: (await import("@/pages/PosPage")).PosPage
}));

const ProductsPage = lazy(async () => ({
  default: (await import("@/pages/ProductsPage")).ProductsPage
}));

const OrdersPage = lazy(async () => ({
  default: (await import("@/pages/OrdersPage")).OrdersPage
}));

const InventoryPage = lazy(async () => ({
  default: (await import("@/pages/InventoryPage")).InventoryPage
}));

const SalesPage = lazy(async () => ({
  default: (await import("@/pages/SalesPage")).SalesPage
}));

const DiscountsPage = lazy(async () => ({
  default: (await import("@/pages/DiscountsPage")).DiscountsPage
}));

const TeamPage = lazy(async () => ({
  default: (await import("@/pages/TeamPage")).TeamPage
}));

const ReceiptPage = lazy(async () => ({
  default: (await import("@/pages/ReceiptPage")).ReceiptPage
}));

const PlaceholderPage = lazy(async () => ({
  default: (await import("@/pages/PlaceholderPage")).PlaceholderPage
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
          { path: "settings", element: <PlaceholderPage title="Settings" /> }
        ]
      },
      {
        path: "orders/:orderId/receipt",
        element: <ReceiptPage />
      }
    ]
  }
]);
