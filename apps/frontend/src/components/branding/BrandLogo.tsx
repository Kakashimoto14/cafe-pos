import cozyCafeLogo from "@/assets/brand/cozy-cafe-logo.svg";
import cozyCafeMark from "@/assets/brand/cozy-cafe-mark.svg";
import { cn } from "@/utils/cn";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  variant?: "full" | "mark";
};

export function BrandLogo({ className, markClassName, variant = "full" }: BrandLogoProps) {
  if (variant === "mark") {
    return <img src={cozyCafeMark} alt="Cozy Cafe POS" className={cn("h-12 w-12", markClassName)} />;
  }

  return <img src={cozyCafeLogo} alt="Cozy Cafe POS" className={cn("h-12 w-auto", className)} />;
}
