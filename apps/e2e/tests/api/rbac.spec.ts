import { expect, test } from "@playwright/test";
import {
  ADMIN,
  USER,
  call,
  expectNoInternals,
  login,
} from "../helpers/real-api";

const ADMIN_ONLY = [
  "/api/v1/users",
  "/api/v1/admin/stats",
  "/api/v1/admin/recent-activity",
  "/api/v1/admin/charts/users-growth",
  "/api/v1/admin/reports/user-summary",
];

test("admin endpoints require a token", async () => {
  for (const path of ["/api/v1/auth/me", ...ADMIN_ONLY]) {
    const res = await call("GET", path);
    expect(res.status, path).toBe(401);
    expectNoInternals(res.text);
  }
});

test("a regular user is forbidden from admin endpoints", async () => {
  const { token } = await login(USER);
  for (const path of ADMIN_ONLY) {
    const res = await call("GET", path, { token });
    expect(res.status, path).toBe(403);
    expectNoInternals(res.text);
  }
  // Nor can they read or delete other users by id.
  expect((await call("GET", "/api/v1/users/1", { token })).status).toBe(403);
  expect((await call("DELETE", "/api/v1/users/1", { token })).status).toBe(403);
});

test("an admin can reach admin endpoints", async () => {
  const { token } = await login(ADMIN);
  for (const path of ADMIN_ONLY) {
    expect((await call("GET", path, { token })).status, path).toBe(200);
  }
});

test("admin user listing never includes password hashes", async () => {
  const { token } = await login(ADMIN);
  const res = await call("GET", "/api/v1/users", { token });
  expect(res.text).not.toMatch(/"password"|\$2[aby]\$/);
});
