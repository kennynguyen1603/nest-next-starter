import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  provider: string
}

interface AuthState {
  accessToken: string | null
  tokenExpires: number | null
  user: AuthUser | null
  setAuth: (token: string, tokenExpires: number, user: AuthUser) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  tokenExpires: null,
  user: null,
  setAuth: (token, tokenExpires, user) => set({ accessToken: token, tokenExpires, user }),
  clearAuth: () => set({ accessToken: null, tokenExpires: null, user: null }),
}))
