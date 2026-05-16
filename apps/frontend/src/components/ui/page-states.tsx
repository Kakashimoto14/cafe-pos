import type { ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageErrorState({
  title = "Something went wrong",
  message,
  onRetry
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-rose-200 bg-rose-50 p-6 text-rose-700">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/80 p-2 text-rose-500">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-rose-700">{title}</h2>
          <p className="mt-2 text-sm leading-6">{message}</p>
          {onRetry ? (
            <Button type="button" variant="secondary" className="mt-4 border-rose-200 bg-white text-rose-700 hover:bg-rose-100" onClick={onRetry}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function PageEmptyState({
  icon,
  title,
  description,
  action
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="grid min-h-72 place-items-center border-[#eadbcb] bg-white p-6 text-center">
      <div className="max-w-md">
        {icon ? <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-[#f6eee5] text-[#b38d72]">{icon}</div> : null}
        <h2 className="mt-4 text-xl font-semibold text-[#241610]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#7b685c]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </Card>
  );
}

export function SectionCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="border-[#eadbcb] bg-white p-5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-8 w-52" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-[#f0e4d6] bg-[#fffaf4] p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-3 h-4 w-32" />
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card className="border-[#eadbcb] bg-white p-5">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Skeleton className="h-12 w-full md:col-span-2" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="overflow-hidden rounded-[24px] border border-[#f0e4d6]">
          <div className={`grid gap-3 bg-[#fffaf4] px-4 py-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20" />
            ))}
          </div>
          <div className="divide-y divide-[#f0e4d6] bg-white">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className={`grid gap-3 px-4 py-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((__, columnIndex) => (
                  <Skeleton key={columnIndex} className="h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="border-[#eadbcb] bg-white p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-10 w-36" />
          <Skeleton className="mt-3 h-4 w-24" />
        </Card>
      ))}
    </section>
  );
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  label
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-[#eadbcb] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-[#7b685c]">{label ?? `Page ${page} of ${totalPages}`}</div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" className="border border-[#eadbcb] bg-white" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button type="button" variant="ghost" className="border border-[#eadbcb] bg-white" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
