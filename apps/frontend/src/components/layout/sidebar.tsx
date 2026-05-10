import { BarChart3, Coffee, Package2, ReceiptText, Settings2, Users2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";

const items = [
  { to: "/", label: "Overview", icon: BarChart3 },
  { to: "/pos", label: "POS", icon: Coffee },
  { to: "/products", label: "Products", icon: Package2 },
  { to: "/orders", label: "Orders", icon: ReceiptText },
  { to: "/customers", label: "Customers", icon: Users2 },
  { to: "/settings", label: "Settings", icon: Settings2 }
];

export function Sidebar() {
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
