import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuthBootstrap() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrate, hydrated]);

  return hydrated;
}
