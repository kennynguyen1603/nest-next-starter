import { expect, test } from "@playwright/test";
import { WEB_URL } from "../helpers/urls";

// Only the guard paths are exercised: they all return before any request to an
// OAuth provider, so these tests never leave the machine.
const exchange = (provider: string) => `/api/auth/${provider}/exchange`;
const SAME_ORIGIN = { origin: WEB_URL };

test("rejects requests without an Origin header", async ({ request }) => {
  const res = await request.post(exchange("google"), { data: { code: "x" } });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: "Forbidden" });
});

test("rejects cross-origin requests (redirect_uri cannot be spoofed)", async ({
  request,
}) => {
  for (const origin of [
    "https://evil.example",
    "http://localhost:3000.evil.example",
    "null",
  ]) {
    const res = await request.post(exchange("google"), {
      headers: { origin },
      data: { code: "x" },
    });
    expect(res.status(), origin).toBe(403);
  }
});

test("validates the body before contacting any provider", async ({
  request,
}) => {
  const badJson = await request.post(exchange("google"), {
    headers: { ...SAME_ORIGIN, "content-type": "application/json" },
    // A Buffer is sent verbatim; a string would be JSON-encoded by Playwright.
    data: Buffer.from("{not json"),
  });
  expect(badJson.status()).toBe(400);
  expect(await badJson.json()).toEqual({ error: "Invalid request body" });

  const noCode = await request.post(exchange("google"), {
    headers: SAME_ORIGIN,
    data: {},
  });
  expect(noCode.status()).toBe(400);
  expect(await noCode.json()).toEqual({ error: "Missing code" });

  // Valid JSON that is not an object, or a non-string code, must not crash the route.
  for (const raw of ["null", '"x"', '{"code":123}', '{"code":{"a":1}}']) {
    const res = await request.post(exchange("google"), {
      headers: { ...SAME_ORIGIN, "content-type": "application/json" },
      data: Buffer.from(raw),
    });
    expect(res.status(), raw).toBe(400);
    expect(await res.json(), raw).toEqual({ error: "Missing code" });
  }

  const noVerifier = await request.post(exchange("twitter"), {
    headers: SAME_ORIGIN,
    data: { code: "x" },
  });
  expect(noVerifier.status()).toBe(400);
  expect(await noVerifier.json()).toEqual({ error: "Missing codeVerifier" });

  const unknown = await request.post(exchange("myspace"), {
    headers: SAME_ORIGIN,
    data: { code: "x" },
  });
  expect(unknown.status()).toBe(400);
  expect(await unknown.json()).toEqual({ error: "Unknown provider" });
});
