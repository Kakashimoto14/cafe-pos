import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { AuthUser } from "@cafe/shared-types";

type AuthState = {
  session: Session | null;
  user: AuthUser | null;
  isInitialized: boolean;
  setSession: (session: Session, user: AuthUser) => void;
  clearSession: () => void;
  setInitialized: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false,
  setSession: (session, user) => set({ session, user, isInitialized: true }),
  clearSession: () => {
    set({ session: null, user: null, isInitialized: true });
  },
  setInitialized: (value) => set({ isInitialized: value })
}));
