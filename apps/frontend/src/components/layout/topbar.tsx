import { useMutation } from "@tanstack/react-query";
import { Bell, LogOut, MoonStar, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

export function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSettled: () => {
      clearSession();
      navigate("/login", { replace: true });
    }
  });

  return (
    <header className="sticky top-0 z-10 border-b border-white/50 bg-background/80 px-4 py-4 backdrop-blur-xl md:px-6 xl:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Live terminal</p>
          <h2 className="font-display text-2xl text-slate-950">Service command center</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/80 px-4 py-3 shadow-panel">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="w-56 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search orders, products, staff"
            />
          </div>
          <button className="rounded-2xl border border-white/50 bg-white/80 p-3 shadow-panel">
            <Bell className="h-4 w-4 text-slate-600" />
          </button>
          <button className="rounded-2xl border border-white/50 bg-white/80 p-3 shadow-panel">
            <MoonStar className="h-4 w-4 text-slate-600" />
          </button>
          <div className="hidden rounded-2xl border border-white/50 bg-white/80 px-4 py-3 shadow-panel md:block">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{user?.role ?? "operator"}</div>
            <div className="text-sm font-semibold text-slate-900">{user?.name ?? "Terminal user"}</div>
          </div>
          <button
            className="rounded-2xl border border-white/50 bg-white/80 p-3 shadow-panel"
            onClick={() => logoutMutation.mutate()}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
