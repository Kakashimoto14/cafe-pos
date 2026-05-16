import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { RouterProvider } from "react-router-dom";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";
import "@/styles/index.css";

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
