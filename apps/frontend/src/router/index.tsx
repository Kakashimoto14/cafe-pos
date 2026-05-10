import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";
import { RequireAuth } from "@/router/RequireAuth";

const DashboardPage = lazy(async () => ({
  default: (await import("@/pages/DashboardPage")).DashboardPage
}));

const LoginPage = lazy(async () => ({
  default: (await import("@/pages/LoginPage")).LoginPage
}));

const PosPage = lazy(async () => ({
  default: (await import("@/pages/PosPage")).PosPage
}));

const PlaceholderPage = lazy(async () => ({
  default: (await import("@/pages/PlaceholderPage")).PlaceholderPage
}));

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "pos", element: <PosPage /> },
          { path: "products", element: <PlaceholderPage title="Products" /> },
          { path: "orders", element: <PlaceholderPage title="Orders" /> },
          { path: "customers", element: <PlaceholderPage title="Customers" /> },
          { path: "settings", element: <PlaceholderPage title="Settings" /> }
        ]
      }
    ]
  }
]);
