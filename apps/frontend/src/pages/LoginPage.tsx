import { startTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Coffee, ReceiptText, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4)
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const from = (location.state as { from?: string } | null)?.from ?? "/pos";

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "cashier@cafeposdemo.com",
      password: "CafePos123!"
    }
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) => apiClient.login(values),
    onSuccess: (result) => {
      setSession(result.session, result.user);
      startTransition(() => navigate(from, { replace: true }));
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(239,227,211,0.92),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(192,138,90,0.18),_transparent_24%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] items-center gap-8 px-4 py-6 md:px-6 lg:grid-cols-[1.12fr_520px] lg:px-8 lg:py-8">
        <section className="order-2 space-y-6 lg:order-1 lg:pr-8">
          <div className="inline-flex items-center gap-4 rounded-[24px] border border-[#eadbcb] bg-white/92 px-4 py-3 text-sm font-medium text-[#7a4a2e] shadow-[0_12px_24px_rgba(74,43,24,0.06)]">
            <BrandLogo className="h-16" />
            Cozy Cafe POS
          </div>

          <div>
            <h1 className="max-w-3xl font-display text-4xl leading-tight text-[#241610] sm:text-5xl xl:text-6xl">
              Modern POS built for faster cafe service.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#7b685c] sm:text-lg">
              Manage orders, products, staff, and daily sales from one clean dashboard powered by Supabase.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: Coffee, title: "Fast checkout", body: "Keep the counter moving with a touch-friendly cashier flow." },
              { icon: ReceiptText, title: "Live product catalog", body: "Menu items, pricing, and stock stay connected to real data." },
              { icon: Users, title: "Staff role access", body: "Admins, managers, and cashiers each see the right controls." },
              { icon: BadgeCheck, title: "Sales-ready workflow", body: "Orders, totals, and status updates are built for daily operations." }
            ].map((item) => (
              <Card key={item.title} className="border-[#eadbcb] bg-white/92 p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#241610]">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-[#7b685c]">{item.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-hidden border-[#eadbcb] bg-[linear-gradient(135deg,#fffdf9,#f5ede4)] p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f7767]">Daily snapshot</div>
                <h2 className="mt-3 text-2xl font-semibold text-[#241610]">Cafe-ready service controls</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#7b685c]">
                  Watch sales, manage product availability, and keep the cashier lane responsive from one warm, clean workspace.
                </p>
              </div>
            <div className="rounded-[24px] border border-[#eadbcb] bg-white p-4 shadow-[0_16px_32px_rgba(74,43,24,0.07)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Today</div>
              <div className="mt-2 text-3xl font-semibold text-[#3b2418]">PHP 18,420</div>
              <div className="mt-2 text-sm text-[#7b685c]">42 orders completed / 3 low-stock alerts</div>
            </div>
          </div>
        </Card>
      </section>

      <section className="order-1 flex items-center justify-center lg:order-2">
          <Card className="w-full max-w-md border-[#eadbcb] bg-white/96 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-20" />
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f7767]">Cozy Cafe POS</div>
            </div>
            <h2 className="mt-3 font-display text-4xl text-[#241610]">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-[#7b685c]">Sign in to your cafe workspace and start serving faster.</p>

            <div className="mt-5 rounded-2xl border border-[#eadbcb] bg-[#fffaf4] p-4 text-sm text-[#6c584b]">
              <div className="font-semibold text-[#3b2418]">Demo access</div>
              <div className="mt-2">`cashier@cafeposdemo.com`</div>
              <div>`CafePos123!`</div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5f4637]">Email</label>
                <input {...form.register("email")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {form.formState.errors.email ? (
                  <p className="text-sm text-rose-500">{form.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#5f4637]">Password</label>
                <input
                  {...form.register("password")}
                  type="password"
                  className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4"
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-rose-500">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              {loginMutation.isError ? <p className="text-sm text-rose-500">{loginMutation.error.message}</p> : null}

              <Button className="w-full" size="lg" type="submit" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Open workspace"}
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </div>
  );
}
