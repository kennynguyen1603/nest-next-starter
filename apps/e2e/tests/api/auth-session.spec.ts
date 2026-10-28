import { expect, test } from "@playwright/test";
import {
  ADMIN,
  USER,
  call,
  cookiePair,
  expectNoInternals,
  login,
  newClient,
  refreshSetCookie,
} from "../helpers/real-api";

test("login sets an HttpOnly refresh cookie and never returns it in the body", async () => {
  const api = await newClient();
  const res = await api.post("/api/v1/auth/email/login", { data: USER });
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(typeof body.token).toBe("string");
  expect(body).not.toHaveProperty("refreshToken");
  expect(JSON.stringify(body)).not.toMatch(/password|hash/i);

  const setCookie = refreshSetCookie(res);
  expect(setCookie).toBeDefined();
  expect(setCookie).toMatch(/;\s*HttpOnly/i);
  expect(setCookie).toMatch(/;\s*SameSite=Lax/i);
  expect(setCookie).toMatch(/;\s*Path=\//i);
  // The cookie value is opaque to the body: no copy of it anywhere in JSON.
  expect(JSON.stringify(body)).not.toContain(
    cookiePair(setCookie).split("=")[1],
  );
  await api.dispose();
});

test("wrong password is rejected without leaking internals", async () => {
  const api = await newClient();
  const res = await api.post("/api/v1/auth/email/login", {
    data: { email: USER.email, password: "definitely-wrong" },
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
  expect(res.status()).toBeLessThan(500);
  expect(refreshSetCookie(res)).toBeUndefined();
  expectNoInternals(await res.text());
  await api.dispose();
});

test("unknown email gets the same rejection as a wrong password", async () => {
  const api = await newClient();
  const wrongPass = await api.post("/api/v1/auth/email/login", {
    data: { email: USER.email, password: "definitely-wrong" },
  });
  const noUser = await api.post("/api/v1/auth/email/login", {
    data: { email: "nobody.e2e@example.test", password: "definitely-wrong" },
  });
  expect(noUser.status()).toBe(wrongPass.status());
  expectNoInternals(await noUser.text());
  await api.dispose();
});

test("refresh rotates the cookie and a replayed old cookie revokes the session", async () => {
  const { cookie: first } = await login(USER);

  const rotated = await call("POST", "/api/v1/auth/refresh", { cookie: first });
  expect(rotated.status).toBe(200);
  expect(JSON.parse(rotated.text)).not.toHaveProperty("refreshToken");
  const second = cookiePair(rotated.setCookie);
  expect(second).not.toBe(first);

  // Reusing the rotated-out token looks like theft: reject it...
  const replay = await call("POST", "/api/v1/auth/refresh", { cookie: first });
  expect(replay.status).toBe(401);
  expectNoInternals(replay.text);

  // ...and kill the whole session, so the thief's fresh token dies too.
  const after = await call("POST", "/api/v1/auth/refresh", { cookie: second });
  expect(after.status).toBe(401);
});

test("logout clears the cookie and invalidates both tokens", async () => {
  const { token, cookie } = await login(USER);
  expect((await call("GET", "/api/v1/auth/me", { token })).status).toBe(200);

  const out = await call("POST", "/api/v1/auth/logout", { cookie });
  expect(out.status).toBe(200);
  expect(out.setCookie).toMatch(
    /refresh_token=;|Max-Age=0|Expires=Thu, 01 Jan 1970/i,
  );

  expect((await call("POST", "/api/v1/auth/refresh", { cookie })).status).toBe(
    401,
  );
  // The access token is bound to the deleted session, not just its expiry.
  expect((await call("GET", "/api/v1/auth/me", { token })).status).toBe(401);
});

test("refresh and logout refuse requests without a valid cookie", async () => {
  for (const path of ["/api/v1/auth/refresh", "/api/v1/auth/logout"]) {
    expect((await call("POST", path)).status).toBe(401);
    expect(
      (await call("POST", path, { cookie: "refresh_token=forged.jwt.value" }))
        .status,
    ).toBe(401);
  }
  // An access token must not be accepted where a refresh token is required.
  const { token } = await login(USER);
  expect(
    (
      await call("POST", "/api/v1/auth/refresh", {
        cookie: `refresh_token=${token}`,
      })
    ).status,
  ).toBe(401);
});

test("/auth/me does not expose the password or its hash", async () => {
  const { token } = await login(USER);
  const me = await call("GET", "/api/v1/auth/me", { token });
  expect(me.status).toBe(200);
  expect(me.text).not.toMatch(/"password"|"hash"|\$2[aby]\$/);
});

test("session list exposes only safe fields", async () => {
  const { token } = await login(USER);
  const res = await call("GET", "/api/v1/auth/sessions", { token });
  expect(res.status).toBe(200);
  const sessions = JSON.parse(res.text) as Record<string, unknown>[];
  expect(sessions.length).toBeGreaterThan(0);
  expect(sessions.filter((s) => s.isCurrent)).toHaveLength(1);
  for (const s of sessions) {
    expect(Object.keys(s).sort()).toEqual(
      [
        "createdAt",
        "deviceId",
        "deviceName",
        "id",
        "ipAddress",
        "isCurrent",
        "lastUsedAt",
        "platform",
      ].sort(),
    );
  }
});

test("a user cannot revoke another user's session (IDOR)", async () => {
  const admin = await login(ADMIN);
  const user = await login(USER);

  const adminSessions = JSON.parse(
    (await call("GET", "/api/v1/auth/sessions", { token: admin.token })).text,
  ) as { id: string; isCurrent: boolean }[];
  const target = adminSessions.find((s) => s.isCurrent)!;

  const attack = await call("DELETE", `/api/v1/auth/sessions/${target.id}`, {
    token: user.token,
  });
  expect(attack.status).toBe(404);
  expectNoInternals(attack.text);

  // The admin session survives.
  expect(
    (await call("GET", "/api/v1/auth/me", { token: admin.token })).status,
  ).toBe(200);
  expect(
    (await call("POST", "/api/v1/auth/refresh", { cookie: admin.cookie }))
      .status,
  ).toBe(200);
});

test("revoking all other sessions keeps only the current one", async () => {
  const keep = await login(USER);
  const other = await login(USER);

  const res = await call("DELETE", "/api/v1/auth/sessions", {
    token: keep.token,
  });
  expect(res.status).toBe(200);

  expect(
    (await call("GET", "/api/v1/auth/me", { token: other.token })).status,
  ).toBe(401);
  expect(
    (await call("POST", "/api/v1/auth/refresh", { cookie: other.cookie }))
      .status,
  ).toBe(401);
  expect(
    (await call("GET", "/api/v1/auth/me", { token: keep.token })).status,
  ).toBe(200);
});

test("tampered or unsigned access tokens are rejected", async () => {
  const { token } = await login(USER);
  const [header, payload] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload!, "base64url").toString());
  const forged = Buffer.from(
    JSON.stringify({ ...claims, role: { id: 1 } }),
  ).toString("base64url");
  const none = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");

  for (const bad of [
    `${header}.${forged}.${token.split(".")[2]}`,
    `${none}.${payload}.`,
    "not-a-jwt",
  ]) {
    const res = await call("GET", "/api/v1/auth/me", { token: bad });
    expect(res.status).toBe(401);
    expectNoInternals(res.text);
  }
});
