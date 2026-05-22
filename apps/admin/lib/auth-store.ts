import { create } from "zustand";
import type { AuthUser } from "@repo/types";

interface AuthState {
  accessToken: string | null;
  tokenExpires: number | null;
  user: AuthUser | null;
  setAuth: (token: string, tokenExpires: number, user: AuthUser | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  tokenExpires: null,
  user: null,
  setAuth: (token, tokenExpires, user) =>
    set({ accessToken: token, tokenExpires, user }),
  clearAuth: () => set({ accessToken: null, tokenExpires: null, user: null }),
}));
