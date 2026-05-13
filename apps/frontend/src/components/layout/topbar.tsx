import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgePercent, Bell, CheckCircle2, LogOut, ReceiptText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "@/services/api-client";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clearedNotifications, setClearedNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const pageMeta: Record<string, { eyebrow: string; title: string }> = {
    "/": { eyebrow: "Overview", title: "Overview" },
    "/pos": { eyebrow: "POS", title: "Cashier Terminal" },
    "/products": { eyebrow: "Catalog", title: "Product Catalog" },
    "/orders": { eyebrow: "Orders", title: "Orders" },
    "/inventory": { eyebrow: "Inventory", title: "Inventory" },
    "/sales": { eyebrow: "Sales", title: "Sales" },
    "/discounts": { eyebrow: "Discounts", title: "Discounts" },
    "/team": { eyebrow: "Team", title: "Team" },
    "/settings": { eyebrow: "Settings", title: "Settings" }
  };

  const currentPage = pageMeta[location.pathname] ?? pageMeta["/"];
  const productsQuery = useQuery({
    queryKey: ["products", "notifications"],
    queryFn: () => apiClient.products({ activeOnly: true })
  });
  const ordersQuery = useQuery({
    queryKey: ["orders", "notifications"],
    queryFn: () => apiClient.listOrders(1)
  });
  const discountsQuery = useQuery({
    queryKey: ["discounts", "notifications"],
    queryFn: () => apiClient.discounts({ activeOnly: true })
  });

  const notifications = useMemo(() => {
    if (clearedNotifications) {
      return [];
    }

    const lowStock = (productsQuery.data ?? [])
      .filter((product) => product.stockQuantity <= product.lowStockThreshold)
      .slice(0, 3)
      .map((product) => ({
        id: `stock-${product.id}`,
        icon: AlertTriangle,
        title: `${product.name} is low`,
        detail: `${product.stockQuantity} left / threshold ${product.lowStockThreshold}`
      }));
    const latestOrder = ordersQuery.data?.[0]
      ? [
          {
            id: `order-${ordersQuery.data[0].id}`,
            icon: ReceiptText,
            title: `Order ${ordersQuery.data[0].orderNumber} completed`,
            detail: `${ordersQuery.data[0].cashierName} / ${ordersQuery.data[0].paymentMethod.toUpperCase()}`
          }
        ]
      : [];
    const promoReminder = (discountsQuery.data ?? []).some((discount) => discount.scope === "promo")
      ? [
          {
            id: "promo-reminder",
            icon: BadgePercent,
            title: "Promo codes are active",
            detail: "Review available promos before peak service."
          }
        ]
      : [];

    return [...lowStock, ...latestOrder, ...promoReminder];
  }, [clearedNotifications, discountsQuery.data, ordersQuery.data, productsQuery.data]);

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

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  return (
    <header className="sticky top-0 z-10 border-b border-[#eadbcb] bg-[rgba(255,253,249,0.9)] px-4 py-4 backdrop-blur-xl print:hidden md:px-6 xl:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[#8f7767]">{currentPage.eyebrow}</p>
          <h2 className="font-display text-2xl text-[#241610]">{currentPage.title}</h2>
        </div>
        <div className="flex items-center gap-3 md:justify-end">
          <div className="relative" ref={notificationRef}>
            <button
              className="relative rounded-2xl border border-[#eadbcb] bg-white p-3 shadow-[0_12px_28px_rgba(74,43,24,0.06)] transition hover:bg-[#fffaf4]"
              type="button"
              aria-expanded={notificationsOpen}
              aria-label="Open notifications"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell className="h-4 w-4 text-[#6c584b]" />
              {notifications.length > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#a14f43]" /> : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] rounded-[24px] border border-[#eadbcb] bg-white p-3 shadow-[0_24px_60px_rgba(74,43,24,0.16)]">
                <div className="flex items-center justify-between gap-3 px-2 py-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7767]">Notifications</div>
                    <div className="mt-1 text-sm font-semibold text-[#241610]">Cafe alerts</div>
                  </div>
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#7a4a2e]"
                      onClick={() => setClearedNotifications(true)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>

                <div className="mt-2 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#d9c2ac] bg-[#fffaf4] p-4 text-sm text-[#7b685c]">
                      <CheckCircle2 className="mb-2 h-5 w-5 text-[#7a4a2e]" />
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="flex gap-3 rounded-2xl border border-[#f0e4d6] bg-[#fffaf4] p-3">
                        <div className="mt-0.5 rounded-xl bg-[#f3e7d8] p-2 text-[#7a4a2e]">
                          <notification.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#241610]">{notification.title}</div>
                          <div className="mt-1 text-xs leading-5 text-[#7b685c]">{notification.detail}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
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
