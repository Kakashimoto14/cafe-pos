import { Card } from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Card className="p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Module scaffold</div>
      <h2 className="mt-2 font-display text-3xl text-slate-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm text-slate-500">
        This route is intentionally scaffolded for the next implementation phase, where full CRUD grids, forms,
        optimistic mutations, filters, and audit visibility will live.
      </p>
    </Card>
  );
}
