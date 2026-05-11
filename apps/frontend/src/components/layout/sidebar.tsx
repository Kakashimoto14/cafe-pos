import { BarChart3, BadgePercent, Boxes, Coffee, Package2, ReceiptText, Settings2, TrendingUp, Users2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { AppRole } from "@cafe/shared-types";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { useAuthStore } from "@/stores/auth-store";
import { canManageDiscounts, canManageInventory, canManageTeam, canViewSales, canViewSettings } from "@/utils/roles";
import { cn } from "@/utils/cn";

function buildNavItems(role?: AppRole) {
  return [
    { to: "/", label: "Overview", icon: BarChart3, visible: true },
    { to: "/pos", label: "POS", icon: Coffee, visible: true },
    { to: "/products", label: "Products", icon: Package2, visible: true },
    { to: "/orders", label: "Orders", icon: ReceiptText, visible: true },
    { to: "/inventory", label: "Inventory", icon: Boxes, visible: canManageInventory(role) },
    { to: "/sales", label: "Sales", icon: TrendingUp, visible: canViewSales(role) },
    { to: "/discounts", label: "Discounts", icon: BadgePercent, visible: canManageDiscounts(role) },
    { to: "/team", label: "Team", icon: Users2, visible: canManageTeam(role) },
    { to: "/settings", label: "Settings", icon: Settings2, visible: canViewSettings(role) }
  ].filter((item) => item.visible);
}

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.user?.role);
  const items = buildNavItems(role);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen overflow-hidden border-r border-[#eadbcb] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,238,0.96))] p-4 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="shrink-0 rounded-[24px] border border-[#eadbcb] bg-white/95 p-4 shadow-[0_16px_34px_rgba(74,43,24,0.07)]">
          <div className="flex items-center gap-3">
            <BrandLogo variant="mark" markClassName="h-14 w-14" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f7767]">Cozy Cafe</div>
              <div className="mt-1 font-display text-xl text-[#241610]">POS</div>
            </div>
          </div>
        </div>

        <nav className="my-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "border border-[#d9c2ac] bg-[#f3e7d8] text-[#3b2418] shadow-[0_8px_24px_rgba(122,74,46,0.08)]"
                    : "text-[#6c584b] hover:bg-[#f7efe5] hover:text-[#3b2418]"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 rounded-[24px] border border-[#eadbcb] bg-white/95 p-4 shadow-[0_16px_34px_rgba(74,43,24,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f3e7d8] text-sm font-bold uppercase text-[#7a4a2e]">
              {(user?.name ?? "Cafe Operator")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f7767]">{user?.role ?? "operator"}</div>
              <div className="mt-1 truncate font-semibold text-[#241610]">{user?.name ?? "Cafe operator"}</div>
              <div className="mt-1 truncate text-sm text-[#7b685c]">{user?.email ?? "workspace@cozycafe.local"}</div>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eadbcb] bg-[rgba(255,253,249,0.97)] px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex min-w-[82px] flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition",
                  isActive ? "bg-[#f3e7d8] text-[#3b2418]" : "text-[#7b685c] hover:bg-[#f8f0e7]"
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
