import { useAuthStore } from "@/lib/auth-store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && path !== "/api/v1/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options);
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: "Request failed" }));
    const error: Error & {
      details?: { property: string; message: string }[];
    } = new Error((data as { message?: string })?.message ?? "Request failed");
    // Surface field-level validation errors so forms can map them via setError.
    if (Array.isArray((data as { details?: unknown }).details)) {
      error.details = (
        data as { details: { property: string; message: string }[] }
      ).details;
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function clearSession(): Promise<void> {
  await fetch("/api/auth/clear-session", { method: "POST" }).catch(() => {});
}

// Dedupe concurrent refreshes (layout bootstrap + a page fetch + a 401 retry can
// all fire at once) so they share one round-trip instead of racing.
let refreshInFlight: Promise<boolean> | null = null;

export function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      await clearSession();
      return false;
    }
    const { token, tokenExpires } = (await res.json()) as {
      token: string;
      tokenExpires: number;
    };
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = meRes.ok ? await meRes.json() : null;
    useAuthStore.getState().setAuth(token, tokenExpires, user);
    return true;
  } catch {
    await clearSession();
    return false;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "GET", ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "POST", body, ...options }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { method: "PATCH", body, ...options }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: "DELETE", ...options }),
};
