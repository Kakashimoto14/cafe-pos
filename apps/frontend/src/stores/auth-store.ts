import { create } from "zustand";
import type { AuthUser } from "@cafe/shared-types";

const STORAGE_KEY = "cafe-pos-auth";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      set({ hydrated: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
      set({ token: parsed.token, user: parsed.user, hydrated: true });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      set({ hydrated: true });
    }
  },
  setSession: (token, user) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },
  clearSession: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  }
}));
