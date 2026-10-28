import { request, type APIResponse } from "@playwright/test";
import { API_URL } from "./urls";

// Seed demo users: they exist only in the throwaway DB from scripts/api-up.sh.
export const ADMIN = { email: "admin@example.com", password: "secret" };
export const USER = { email: "john.doe@example.com", password: "secret" };

/** Fresh context per caller, so cookies never leak between scenarios. */
export const newClient = () => request.newContext({ baseURL: API_URL });

/** The raw `refresh_token` Set-Cookie header, or undefined. */
export function refreshSetCookie(res: Pick<APIResponse, "headersArray">) {
  return res
    .headersArray()
    .find(
      (h) =>
        h.name.toLowerCase() === "set-cookie" &&
        h.value.startsWith("refresh_token="),
    )?.value;
}

/** `refresh_token=<value>` ready to send back as a Cookie header. */
export function cookiePair(setCookie: string | undefined) {
  if (!setCookie) throw new Error("no refresh_token cookie");
  return setCookie.split(";")[0]!;
}

export async function login(creds: { email: string; password: string }) {
  const api = await newClient();
  const res = await api.post("/api/v1/auth/email/login", { data: creds });
  if (!res.ok()) throw new Error(`login failed: ${res.status()}`);
  const body = (await res.json()) as { token: string };
  const cookie = cookiePair(refreshSetCookie(res));
  await api.dispose();
  return { token: body.token, cookie };
}

/** Calls with only the given credentials: no stored cookies, no defaults. */
export async function call(
  method: "GET" | "POST" | "DELETE" | "OPTIONS",
  path: string,
  auth: { token?: string; cookie?: string } = {},
  headers: Record<string, string> = {},
) {
  const api = await newClient();
  const res = await api.fetch(path, {
    method,
    headers: {
      ...(auth.token ? { authorization: `Bearer ${auth.token}` } : {}),
      ...(auth.cookie ? { cookie: auth.cookie } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  // Read everything before dispose: the response is unusable afterwards.
  const out = {
    status: res.status(),
    headers: res.headers(),
    setCookie: refreshSetCookie(res),
    text,
  };
  await api.dispose();
  return out;
}

/** Error bodies must never expose stack traces or internals. */
export function expectNoInternals(text: string) {
  for (const marker of [
    "stack",
    "at Object.",
    "node_modules",
    "QueryFailedError",
    "SELECT ",
    "INSERT ",
  ]) {
    if (text.includes(marker))
      throw new Error(`response leaks "${marker}": ${text.slice(0, 200)}`);
  }
}
