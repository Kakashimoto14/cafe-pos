import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api-client";

export function useCafeSettings() {
  return useQuery({
    queryKey: ["business-settings"],
    queryFn: () => apiClient.businessSettings(),
    staleTime: 60_000
  });
}
