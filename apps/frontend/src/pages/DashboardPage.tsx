import { Card } from "@/components/ui/card";

const metrics = [
  { label: "Revenue", value: "PHP 86,420", detail: "+12.5% vs yesterday" },
  { label: "Orders", value: "328", detail: "Average prep 5m 21s" },
  { label: "Top product", value: "Sea Salt Latte", detail: "52 sold this shift" },
  { label: "Inventory alert", value: "3 low-stock items", detail: "Milk, cups, croissants" }
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-5">
            <div className="text-sm font-medium text-slate-500">{metric.label}</div>
            <div className="mt-4 text-3xl font-semibold text-slate-950">{metric.value}</div>
            <div className="mt-2 text-sm text-slate-500">{metric.detail}</div>
          </Card>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live operations</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Rush-hour visibility</h3>
          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            This area is reserved for sales trends, peak-hour heatmaps, cashier throughput, and kitchen backlog charts.
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shift health</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Reconciliation watchlist</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div>Opening float verified at PHP 4,000</div>
            <div>1 pending refund needs manager approval</div>
            <div>Kitchen queue threshold is healthy</div>
          </div>
        </Card>
      </section>
    </div>
  );
}
