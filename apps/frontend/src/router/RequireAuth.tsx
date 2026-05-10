import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap";
import { useAuthStore } from "@/stores/auth-store";

export function RequireAuth() {
  const location = useLocation();
  const hydrated = useAuthBootstrap();
  const token = useAuthStore((state) => state.token);

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <Card className="w-full max-w-md p-6 text-sm text-slate-500">Restoring operator session...</Card>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
