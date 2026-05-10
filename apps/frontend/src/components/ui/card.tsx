import { cn } from "@/utils/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/60 bg-white/80 shadow-panel backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
