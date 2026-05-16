import { useQuery } from "@tanstack/react-query";
import { appQueryOptions } from "@/lib/app-queries";

export function useCafeSettings() {
  return useQuery(appQueryOptions.settings());
}
