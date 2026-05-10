import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(188,242,215,0.45),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(241,204,143,0.35),_transparent_28%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <main className="flex min-h-screen flex-col">
          <Topbar />
          <div className="flex-1 p-4 md:p-6 xl:p-8">
            <Suspense
              fallback={
                <Card className="p-6">
                  <div className="text-sm text-slate-500">Loading workspace...</div>
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
