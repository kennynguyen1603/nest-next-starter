import { expect, test } from "@playwright/test";
import { ADMIN_URL } from "../helpers/urls";

const ROUTE = "/api/auth/clear-session";

test("rejects requests without a same-origin Origin header", async ({
  request,
}) => {
  for (const origin of [
    undefined,
    "https://evil.example",
    "http://localhost:3000",
    "null",
  ]) {
    const res = await request.post(ROUTE, {
      headers: origin
        ? { origin, cookie: "refresh_token=keep-me" }
        : { cookie: "refresh_token=keep-me" },
    });
    expect(res.status(), String(origin)).toBe(403);
    expect(await res.json()).toEqual({ ok: false });
    // A refused request must not touch the cookie.
    expect(res.headers()["set-cookie"]).toBeUndefined();
  }
});

test("same-origin request expires the refresh cookie", async ({ request }) => {
  const res = await request.post(ROUTE, {
    headers: { origin: ADMIN_URL, cookie: "refresh_token=drop-me" },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });

  const setCookie = res.headers()["set-cookie"] ?? "";
  expect(setCookie).toMatch(/refresh_token=;/);
  expect(setCookie).toMatch(/Path=\//i);
  expect(setCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
});

test("GET is not an accepted method", async ({ request }) => {
  const res = await request.get(ROUTE, { maxRedirects: 0 });
  expect(res.status()).toBe(405);
});
