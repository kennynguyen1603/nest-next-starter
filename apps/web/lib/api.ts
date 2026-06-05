import { useAuthStore } from "@/lib/auth-store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export function getLocale(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|;)\s*NEXT_LOCALE=([^;]+)/);
  return match?.[1] ?? "en";
}

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
      "x-custom-lang": getLocale(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && path !== "/api/v1/auth/refresh") {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options);
    }
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Request failed" }));
    const error: Error & { details?: { property: string; message: string }[] } =
      new Error(body?.message ?? "Request failed");
    if (Array.isArray(body?.details)) error.details = body.details;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Dedupe concurrent refreshes (home bootstrap, a page fetch, a 401 retry, and
// React StrictMode's double-invoked effects can all fire at once). Because the
// backend rotates the refresh-token hash on every use, two parallel calls with
// the same cookie would race: the first rotates the hash, the second 401s and
// would bounce the user back to /login. Sharing one in-flight round-trip avoids it.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
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
    if (!res.ok) return false;
    const { token, tokenExpires } = await res.json();

    // The refresh endpoint only returns a new token — fetch the user separately.
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-custom-lang": getLocale(),
      },
    });
    const user = meRes.ok ? await meRes.json() : null;
    useAuthStore.getState().setAuth(token, tokenExpires, user);
    return true;
  } catch {
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

export { tryRefresh };
