import { Card } from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Card className="border-[#eadbcb] p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8f7767]">Module scaffold</div>
      <h2 className="mt-2 font-display text-3xl text-[#241610]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7b685c]">
        This route is intentionally scaffolded for the next implementation phase, where full CRUD grids, forms,
        optimistic mutations, filters, and audit visibility will live.
      </p>
    </Card>
  );
}
