import { startTransition, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, Boxes, Coffee, Printer, ReceiptText, SearchCheck, ShieldCheck } from "lucide-react";
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

function usePrefersReducedMotion() {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
}

function CoffeeIntro({ onDone }: { onDone: () => void }) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onDone, reducedMotion ? 250 : 1900);
    return () => window.clearTimeout(timer);
  }, [onDone, reducedMotion]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#fffdf9]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,227,211,0.95),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(122,74,46,0.16),_transparent_30%)]" />
      <div className="relative flex w-[min(92vw,420px)] flex-col items-center rounded-[32px] border border-[#eadbcb] bg-white/92 px-8 py-10 text-center shadow-[0_30px_80px_rgba(74,43,24,0.14)]">
        <div className={reducedMotion ? "coffee-intro-mark reduced-motion" : "coffee-intro-mark"}>
          <span className="steam steam-one" />
          <span className="steam steam-two" />
          <span className="steam steam-three" />
          <Coffee className="h-16 w-16 text-[#7a4a2e]" />
        </div>
        <div className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-[#8f7767]">Cozy Cafe POS</div>
        <h1 className="mt-3 font-display text-3xl text-[#241610]">Brewing your workspace...</h1>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-[#f3e7d8]">
          <div className={reducedMotion ? "coffee-progress reduced-motion" : "coffee-progress"} />
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [introVisible, setIntroVisible] = useState(true);
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

  const features = [
    { icon: ReceiptText, title: "Fast checkout" },
    { icon: SearchCheck, title: "Live product catalog" },
    { icon: Boxes, title: "Inventory tracking" },
    { icon: BarChart3, title: "Sales-ready reports" },
    { icon: ShieldCheck, title: "Staff role access" },
    { icon: Printer, title: "Receipt printing" }
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      {introVisible ? <CoffeeIntro onDone={() => setIntroVisible(false)} /> : null}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_10%,_rgba(239,227,211,0.96),_transparent_28%),radial-gradient(circle_at_90%_12%,_rgba(122,74,46,0.12),_transparent_26%),linear-gradient(135deg,#fffdf9_0%,#f8efe5_54%,#fffaf4_100%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1480px] items-center gap-8 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-8">
        <section className="order-2 space-y-7 lg:order-1">
          <div className="inline-flex items-center gap-3 rounded-[22px] border border-[#eadbcb] bg-white/90 px-4 py-3 shadow-[0_14px_30px_rgba(74,43,24,0.07)]">
            <BrandLogo variant="mark" markClassName="h-12 w-12" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f7767]">Cozy Cafe</div>
              <div className="font-display text-xl text-[#241610]">POS</div>
            </div>
          </div>

          <div>
            <h1 className="max-w-3xl font-display text-4xl leading-tight text-[#241610] sm:text-5xl xl:text-6xl">
              Modern POS built for cozy cafe service.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#7b685c] sm:text-lg">
              Manage orders, products, inventory, discounts, and daily sales from one warm, reliable workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title} className="border-[#eadbcb] bg-white/92 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#f3e7d8] p-3 text-[#7a4a2e]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="font-semibold text-[#241610]">{item.title}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="order-1 flex items-center justify-center lg:order-2">
          <Card className="w-full max-w-md border-[#eadbcb] bg-white/96 p-6 shadow-[0_26px_70px_rgba(74,43,24,0.14)] md:p-8">
            <div className="flex items-center justify-between gap-4">
              <BrandLogo className="h-20 object-contain" />
              <div className="rounded-2xl bg-[#f3e7d8] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a4a2e]">
                Secure login
              </div>
            </div>

            <h2 className="mt-5 font-display text-4xl text-[#241610]">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-[#7b685c]">Open the cafe workspace and start the next order.</p>

            <div className="mt-5 rounded-2xl border border-[#eadbcb] bg-[#fffaf4] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Demo access</div>
              <div className="mt-3 grid gap-2 text-sm text-[#4f3526]">
                <div className="rounded-xl bg-white px-3 py-2 font-medium">cashier@cafeposdemo.com</div>
                <div className="rounded-xl bg-white px-3 py-2 font-medium">CafePos123!</div>
              </div>
            </div>

            <form className="mt-7 space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Email</span>
                <input {...form.register("email")} className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {form.formState.errors.email ? <p className="text-sm text-rose-500">{form.formState.errors.email.message}</p> : null}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#5f4637]">Password</span>
                <input {...form.register("password")} type="password" className="h-12 w-full rounded-2xl bg-[#fffdf9] px-4" />
                {form.formState.errors.password ? <p className="text-sm text-rose-500">{form.formState.errors.password.message}</p> : null}
              </label>

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
