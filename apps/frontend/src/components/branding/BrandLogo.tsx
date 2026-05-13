import cozyCafeLogo from "@/assets/brand/cozy-cafe-pos-logo.png";
import { cn } from "@/utils/cn";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  alt?: string;
  src?: string;
  variant?: "full" | "mark";
};

export function BrandLogo({ className, markClassName, alt = "Cafe logo", src = cozyCafeLogo, variant = "full" }: BrandLogoProps) {
  if (variant === "mark") {
    return <img src={src} alt={alt} className={cn("h-12 w-12 rounded-2xl object-contain", markClassName)} />;
  }

  return <img src={src} alt={alt} className={cn("h-14 w-auto object-contain", className)} />;
}
