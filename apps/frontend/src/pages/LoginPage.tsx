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
      email: "cashier@aurora.test",
      password: "password"
    }
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) =>
      apiClient.login({
        ...values,
        device_name: "Aurora POS Terminal"
      }),
    onSuccess: (result) => {
      setSession(result.token, result.user);
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
              Phase 2 brings the POS online with token auth, live product sync, and real order persistence.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              { icon: ShieldCheck, title: "Token auth", body: "Sanctum-backed device sessions for each terminal." },
              { icon: Coffee, title: "Live catalog", body: "Products are now served from Laravel, not local mock data." },
              { icon: LockKeyhole, title: "Operator roles", body: "Cashiers, managers, and admins are modeled for policy control." }
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
              Demo login is prefilled. Use `cashier@aurora.test` and `password`.
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
