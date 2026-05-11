import { useState } from "react";
import { Coffee } from "lucide-react";
import { cn } from "@/utils/cn";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
};

export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("grid place-items-center bg-[#f8f0e7] text-[#8f7767]", className)}>
        <div className="flex flex-col items-center gap-2 text-sm">
          <Coffee className="h-6 w-6" />
          <span>No image</span>
        </div>
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} className={cn("object-cover", className)} loading="lazy" />;
}
