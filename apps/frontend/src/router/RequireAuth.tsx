import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

export function RequireAuth() {
  const location = useLocation();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);

  if (!isInitialized) {
    return (
      <div className="p-4 md:p-6 xl:p-8">
        <Card className="p-6">
          <div className="text-sm text-slate-500">Restoring your terminal session...</div>
        </Card>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
