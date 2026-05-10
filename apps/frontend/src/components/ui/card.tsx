import { cn } from "@/utils/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[#eadbcb] bg-white shadow-[0_22px_48px_rgba(74,43,24,0.08)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
