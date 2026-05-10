import { type PropsWithChildren, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/api-client";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

export function AuthBootstrap({ children }: PropsWithChildren) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      try {
        const result = await apiClient.getSessionProfile();

        if (!isMounted) {
          return;
        }

        if (result.session && result.user) {
          setSession(result.session, result.user);
        } else {
          clearSession();
        }
      } catch (error) {
        if (isMounted) {
          clearSession();
          toast.error(error instanceof Error ? error.message : "Unable to restore your session.");
        }
      } finally {
        if (isMounted) {
          setInitialized(true);
        }
      }
    };

    void syncSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        try {
          if (session) {
            const user = await apiClient.getProfileForSession(session);

            if (!isMounted) {
              return;
            }

            setSession(session, user);
          } else if (isMounted) {
            clearSession();
          }
        } catch (error) {
          if (isMounted) {
            clearSession();
            toast.error(error instanceof Error ? error.message : "Unable to sync the active session.");
          }
        } finally {
          if (isMounted) {
            setInitialized(true);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, setInitialized, setSession]);

  return children;
}
