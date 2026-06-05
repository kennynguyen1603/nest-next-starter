import { create } from "zustand";
import type { AuthUser } from "@repo/types";

export type { AuthUser };

interface AuthState {
  accessToken: string | null;
  tokenExpires: number | null;
  user: AuthUser | null;
  setAuth: (token: string, tokenExpires: number, user: AuthUser | null) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  tokenExpires: null,
  user: null,
  setAuth: (token, tokenExpires, user) =>
    set({ accessToken: token, tokenExpires, user }),
  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : state.user,
    })),
  clearAuth: () => set({ accessToken: null, tokenExpires: null, user: null }),
}));
