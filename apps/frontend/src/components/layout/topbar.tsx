import { useMutation } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const pageMeta: Record<string, { eyebrow: string; title: string }> = {
    "/": { eyebrow: "Cozy Cafe POS", title: "Today's cafe operations" },
    "/pos": { eyebrow: "Cashier terminal", title: "Take orders without slowing the line" },
    "/products": { eyebrow: "Menu catalog", title: "Products, categories, and pricing" },
    "/orders": { eyebrow: "Order history", title: "Tickets, receipts, and payment flow" },
    "/inventory": { eyebrow: "Inventory control", title: "Track stock and movement history" },
    "/sales": { eyebrow: "Sales reporting", title: "Revenue, top items, and recent transactions" },
    "/discounts": { eyebrow: "Discount rules", title: "Promos, senior, PWD, and manager discounts" },
    "/team": { eyebrow: "Role access", title: "Manage staff permissions" },
    "/settings": { eyebrow: "Workspace settings", title: "Cafe configuration" }
  };

  const currentPage = pageMeta[location.pathname] ?? pageMeta["/"];
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "CC";

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSettled: () => {
      clearSession();
      navigate("/login", { replace: true });
    }
  });

  return (
    <header className="sticky top-0 z-10 border-b border-[#eadbcb] bg-[rgba(255,253,249,0.9)] px-4 py-4 backdrop-blur-xl md:px-6 xl:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#8f7767]">{currentPage.eyebrow}</p>
          <h2 className="font-display text-2xl text-[#241610]">{currentPage.title}</h2>
        </div>
        <div className="flex items-center gap-3 md:justify-end">
          <button className="rounded-2xl border border-[#eadbcb] bg-white p-3 shadow-[0_12px_28px_rgba(74,43,24,0.06)]" type="button">
            <Bell className="h-4 w-4 text-[#6c584b]" />
          </button>
          <div className="hidden items-center gap-3 rounded-2xl border border-[#eadbcb] bg-white px-3 py-2 shadow-[0_12px_28px_rgba(74,43,24,0.06)] md:flex">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f3e7d8] text-sm font-bold text-[#7a4a2e]">
              {initials}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#9a8170]">{user?.role ?? "operator"}</div>
              <div className="text-sm font-semibold text-[#241610]">{user?.name ?? "Terminal user"}</div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            aria-label="Log out"
            className="border-[#eadbcb] bg-white text-[#6c584b] shadow-[0_12px_28px_rgba(74,43,24,0.06)] hover:bg-[#f8f0e7]"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
