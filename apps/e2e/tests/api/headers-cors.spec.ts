import { expect, test } from "@playwright/test";
import { ADMIN_URL, WEB_URL } from "../helpers/urls";
import { call } from "../helpers/real-api";

const HEALTH = "/api/v1/health";

test("security headers are set and the stack is not advertised", async () => {
  const { headers } = await call("GET", HEALTH);
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBeDefined();
  expect(headers["content-security-policy"]).toBeDefined();
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("trusted frontends get a credentialed CORS grant", async () => {
  for (const origin of [WEB_URL, ADMIN_URL]) {
    const { headers } = await call("GET", HEALTH, {}, { origin });
    expect(headers["access-control-allow-origin"]).toBe(origin);
    expect(headers["access-control-allow-credentials"]).toBe("true");
  }
});

test("untrusted origins get no CORS grant, even on preflight", async () => {
  for (const origin of [
    "https://evil.example",
    "http://localhost:3000.evil.example",
    "null",
  ]) {
    const simple = await call("GET", HEALTH, {}, { origin });
    expect(simple.headers["access-control-allow-origin"]).toBeUndefined();

    const preflight = await call(
      "OPTIONS",
      "/api/v1/auth/refresh",
      {},
      {
        origin,
        "access-control-request-method": "POST",
      },
    );
    expect(preflight.headers["access-control-allow-origin"]).not.toBe(origin);
    expect(preflight.headers["access-control-allow-origin"]).not.toBe("*");
  }
});

test("unknown routes return a clean 404", async () => {
  const res = await call("GET", "/api/v1/does-not-exist");
  expect(res.status).toBe(404);
  expect(res.text).not.toMatch(/stack|node_modules|at \w+ \(/);
});
