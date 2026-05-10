import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import type { AppRole } from "@cafe/shared-types";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

type RequireRoleProps = PropsWithChildren<{
  allowedRoles: AppRole[];
}>;

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);

  if (!isInitialized) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-500">Loading your access profile...</div>
      </Card>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
}
