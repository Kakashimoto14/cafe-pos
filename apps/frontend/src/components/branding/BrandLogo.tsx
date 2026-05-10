import cozyCafeLogo from "@/assets/brand/cozy-cafe-pos-logo.png";
import { cn } from "@/utils/cn";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  variant?: "full" | "mark";
};

export function BrandLogo({ className, markClassName, variant = "full" }: BrandLogoProps) {
  if (variant === "mark") {
    return <img src={cozyCafeLogo} alt="Cozy Cafe POS" className={cn("h-12 w-12 rounded-2xl object-contain", markClassName)} />;
  }

  return <img src={cozyCafeLogo} alt="Cozy Cafe POS" className={cn("h-14 w-auto object-contain", className)} />;
}
