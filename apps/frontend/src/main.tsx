import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { RouterProvider } from "react-router-dom";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { router } from "@/router";
import { isSetupRequiredError } from "@/services/api-client";
import "@/styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isSetupRequiredError(error)) {
          return false;
        }

        return failureCount < 2;
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>
);
