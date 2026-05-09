import { useAuthStore } from '@/lib/auth-store'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const token = useAuthStore.getState().accessToken

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && path !== '/api/v1/auth/refresh') {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(path, options)
    }
    useAuthStore.getState().clearAuth()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err?.message ?? 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const data = await res.json()
    useAuthStore.getState().setAuth(data.token, data.tokenExpires, data.user)
    return true
  } catch {
    return false
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...options }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body, ...options }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),
}

export { tryRefresh }
