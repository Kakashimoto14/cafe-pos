import { BarChart3, Coffee, Package2, ReceiptText, Settings2, Users2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { canManageTeam, canViewSettings } from "@/utils/roles";
import { cn } from "@/utils/cn";

export function Sidebar() {
  const role = useAuthStore((state) => state.user?.role);

  const items = [
    { to: "/", label: "Overview", icon: BarChart3, visible: true },
    { to: "/pos", label: "POS", icon: Coffee, visible: true },
    { to: "/products", label: "Products", icon: Package2, visible: true },
    { to: "/orders", label: "Orders", icon: ReceiptText, visible: true },
    { to: "/team", label: "Team", icon: Users2, visible: canManageTeam(role) },
    { to: "/settings", label: "Settings", icon: Settings2, visible: canViewSettings(role) }
  ].filter((item) => item.visible);

  return (
    <aside className="hidden border-r border-white/50 bg-white/70 p-6 backdrop-blur-xl lg:block">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Cafe OS</div>
        <h1 className="mt-3 font-display text-3xl text-slate-950">Aurora POS</h1>
        <p className="mt-2 text-sm text-slate-500">Built for fast service, clean reconciliation, and reliable ops.</p>
      </div>

      <nav className="space-y-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-white hover:text-slate-950"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
