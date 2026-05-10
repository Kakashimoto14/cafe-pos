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

const TeamPage = lazy(async () => ({
  default: (await import("@/pages/TeamPage")).TeamPage
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
            path: "team",
            element: (
              <RequireRole allowedRoles={["admin"]}>
                <TeamPage />
              </RequireRole>
            )
          },
          { path: "settings", element: <PlaceholderPage title="Settings" /> }
        ]
      }
    ]
  }
]);
