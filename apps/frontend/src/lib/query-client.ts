import { QueryClient } from "@tanstack/react-query";
import { isSetupRequiredError } from "@/services/api-client";

export function isAbortLikeError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && /aborterror|aborted a request|signal is aborted/i.test(error.message);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 90_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isSetupRequiredError(error) || isAbortLikeError(error)) {
          return false;
        }

        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 8_000)
    }
  }
});
