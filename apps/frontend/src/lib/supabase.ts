import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://rxrbjryenvsfmnyhyptn.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable__8N-Gv111-N-_KtzIwbyiw_3augXb8c";

const REQUEST_TIMEOUT_MS = 20_000;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 503, 504]);

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables.");
}

async function timeoutRetryFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";

  const runRequest = async () => {
    const controller = new AbortController();
    let timedOut = false;
    const abortFromParent = () => controller.abort();
    init?.signal?.addEventListener("abort", abortFromParent, { once: true });
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal
      });
    } catch (error) {
      if (timedOut) {
        throw new Error("The request is taking longer than usual. Please try again.");
      }

      throw error;
    } finally {
      init?.signal?.removeEventListener("abort", abortFromParent);
      window.clearTimeout(timeoutId);
    }
  };

  const response = await runRequest();

  if (canRetry && RETRYABLE_STATUS_CODES.has(response.status)) {
    return await runRequest();
  }

  return response;
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: timeoutRetryFetch
  }
});
