import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,227,211,0.9),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(192,138,90,0.12),_transparent_24%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="flex min-h-screen flex-col">
          <Topbar />
          <div className="flex-1 p-4 pb-24 md:p-6 md:pb-24 xl:p-8 xl:pb-8 print:p-0">
            <Suspense
              fallback={
                <Card className="p-6">
                  <div className="text-sm text-[#7b685c]">Loading your cafe workspace...</div>
                </Card>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
