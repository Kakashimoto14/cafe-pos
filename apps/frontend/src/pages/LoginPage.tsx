import { startTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Coffee, LockKeyhole, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(188,242,215,0.45),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(241,204,143,0.35),_transparent_28%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_520px]">
        <section className="hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Cafe OS</div>
            <h1 className="mt-4 max-w-lg font-display text-6xl leading-tight text-slate-950">
              Enterprise service flow for modern cafes.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-600">
              Supabase now powers authentication, catalog data, and real-time safe Postgres-backed POS transactions.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              { icon: ShieldCheck, title: "Secure auth", body: "Supabase Auth sessions keep every terminal signed in safely." },
              { icon: Coffee, title: "Live catalog", body: "Products and categories now come from the production Postgres dataset." },
              { icon: LockKeyhole, title: "Operator roles", body: "RLS-backed roles protect products, orders, and team access." }
            ].map((item) => (
              <Card key={item.title} className="flex items-start gap-4 p-5">
                <div className="rounded-2xl bg-slate-950 p-3 text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-950">{item.title}</div>
                  <p className="mt-1 text-sm text-slate-500">{item.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <Card className="w-full max-w-md p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Terminal access</div>
            <h2 className="mt-3 font-display text-4xl text-slate-950">Sign in to Aurora POS</h2>
            <p className="mt-3 text-sm text-slate-500">
              Demo login is prefilled. Use `cashier@cafeposdemo.com` and `CafePos123!` after seeding the Supabase demo accounts.
            </p>

            <form className="mt-8 space-y-4" onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  {...form.register("email")}
                  className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none transition focus:border-slate-950"
                />
                {form.formState.errors.email ? (
                  <p className="text-sm text-rose-500">{form.formState.errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  {...form.register("password")}
                  type="password"
                  className="h-12 w-full rounded-2xl border border-white/60 bg-slate-50 px-4 outline-none transition focus:border-slate-950"
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-rose-500">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              {loginMutation.isError ? (
                <p className="text-sm text-rose-500">{loginMutation.error.message}</p>
              ) : null}

              <Button className="w-full" size="lg" type="submit" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Open terminal"}
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </div>
  );
}
