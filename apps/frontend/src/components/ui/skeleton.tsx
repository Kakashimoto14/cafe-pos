import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-[18px] bg-[length:200%_100%] bg-[linear-gradient(90deg,#f6eee5_0%,#fffaf4_48%,#f1e4d4_100%)] animate-[cafe-skeleton_1.35s_ease-in-out_infinite]", className)} />;
}
