import { expect, test, type Page } from "@playwright/test";
import {
  FAKE_ACCESS_TOKEN,
  FAKE_REFRESH_TOKEN,
  loginReply,
  mockApi,
  readableSecrets,
  userFixture,
} from "../helpers/mock-api";

const LOGIN = "/api/v1/auth/email/login";
const REFRESH_COOKIE = `refresh_token=${FAKE_REFRESH_TOKEN}; Path=/; HttpOnly; SameSite=Lax`;
const STATS = {
  totalUsers: 12,
  newUsersToday: 1,
  activeUsers: 10,
  inactiveUsers: 2,
  userGrowthPercent: 5,
};

/** Counts same-origin calls to the admin's clear-session route (served by Next, not mocked). */
function trackClearSession(page: Page) {
  const hits: string[] = [];
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/api/auth/clear-session")
      hits.push(req.method());
  });
  return hits;
}

async function submitLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("validates the form before calling the API", async ({ page }) => {
  const calls = await mockApi(page, []);
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText("Invalid email")).toBeVisible();
  await expect(page.getByText("Password is required")).toBeVisible();
  expect(calls).toHaveLength(0);
});

test("failed login shows the message without leaking internals", async ({
  page,
}) => {
  await mockApi(page, [
    {
      method: "POST",
      path: LOGIN,
      reply: {
        status: 422,
        // The API's real 422 shape: the reason is in details, not message.
        json: {
          statusCode: 422,
          error: "Unprocessable Entity",
          message: "Validation failed",
          details: [
            {
              property: "email",
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password",
            },
          ],
          stack: "Error: at AuthService.validateLogin (auth.service.ts:42)",
        },
      },
    },
  ]);

  await submitLogin(page, "admin@example.test", "wrong-password1");
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Invalid email or password",
  );
  await expect(page.getByText("Validation failed")).toHaveCount(0);
  await expect(page.getByText("AuthService")).toHaveCount(0);
  await expect(page).toHaveURL(/\/login$/);
});

test("non-admin login is refused and the session is revoked", async ({
  page,
  context,
}) => {
  const clearHits = trackClearSession(page);
  const calls = await mockApi(page, [
    {
      method: "POST",
      path: LOGIN,
      reply: {
        json: { ...loginReply().json, user: userFixture(["user"]) },
        headers: { "set-cookie": REFRESH_COOKIE },
      },
    },
    { method: "POST", path: "/api/v1/auth/logout", reply: { status: 204 } },
  ]);

  await submitLogin(page, "e2e.user@example.test", "password123");

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Access denied. Admin role required.",
  );
  await expect(page).toHaveURL(/\/login$/);
  expect(calls.filter((c) => c.path === "/api/v1/auth/logout")).toHaveLength(1);
  expect(clearHits).toEqual(["POST"]);
  // clear-session expired the refresh cookie, so the proxy no longer lets it in.
  expect(
    (await context.cookies()).some((c) => c.name === "refresh_token"),
  ).toBe(false);
  expect(calls.some((c) => c.path.startsWith("/api/v1/admin/"))).toBe(false);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?from=%2F$/);
});

test("admin login opens the dashboard with the token kept in memory only", async ({
  page,
  context,
}) => {
  const calls = await mockApi(page, [
    {
      method: "POST",
      path: LOGIN,
      reply: {
        json: { ...loginReply().json, user: userFixture(["admin"]) },
        headers: { "set-cookie": REFRESH_COOKIE },
      },
    },
    { method: "GET", path: "/api/v1/admin/stats", reply: { json: STATS } },
    {
      method: "GET",
      path: "/api/v1/admin/recent-activity",
      reply: { json: [] },
    },
    {
      method: "POST",
      path: "/api/v1/auth/logout",
      reply: {
        status: 204,
        headers: {
          "set-cookie": "refresh_token=; Path=/; Max-Age=0; HttpOnly",
        },
      },
    },
  ]);

  await submitLogin(page, "admin@example.test", "password123");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page).toHaveURL(/:\d+\/$/);
  for (const path of ["/api/v1/admin/stats", "/api/v1/admin/recent-activity"]) {
    expect(calls.find((c) => c.path === path)?.authorization, path).toBe(
      `Bearer ${FAKE_ACCESS_TOKEN}`,
    );
  }

  const cookie = (await context.cookies()).find(
    (c) => c.name === "refresh_token",
  );
  expect(cookie?.httpOnly).toBe(true);
  const exposed = JSON.stringify(await readableSecrets(page));
  expect(exposed).not.toContain(FAKE_ACCESS_TOKEN);
  expect(exposed).not.toContain(FAKE_REFRESH_TOKEN);
  expect(exposed).not.toContain("password123");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    calls.find((c) => c.path === "/api/v1/auth/logout")?.authorization,
  ).toBe(`Bearer ${FAKE_ACCESS_TOKEN}`);
});

test("a non-admin refresh cookie cannot open the dashboard", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "refresh_token",
      value: FAKE_REFRESH_TOKEN,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const clearHits = trackClearSession(page);
  const calls = await mockApi(page, [
    { method: "POST", path: "/api/v1/auth/refresh", reply: loginReply() },
    {
      method: "GET",
      path: "/api/v1/auth/me",
      reply: { json: userFixture(["user"]) },
    },
    { method: "POST", path: "/api/v1/auth/logout", reply: { status: 204 } },
    {
      method: "GET",
      path: "/api/v1/admin/stats",
      reply: { status: 401, json: { message: "Unauthorized" } },
    },
    {
      method: "GET",
      path: "/api/v1/admin/recent-activity",
      reply: { status: 401, json: { message: "Unauthorized" } },
    },
  ]);

  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Admin Login" }),
  ).toBeVisible();
  expect(calls.some((c) => c.path === "/api/v1/auth/logout")).toBe(true);
  expect(clearHits.length).toBeGreaterThan(0);
  expect(
    (await context.cookies()).some((c) => c.name === "refresh_token"),
  ).toBe(false);
  // The admin endpoints never received the non-admin's token.
  expect(
    calls
      .filter((c) => c.path.startsWith("/api/v1/admin/"))
      .every((c) => !c.authorization),
  ).toBe(true);
  await expect(page.getByText("Ada Lovelace")).toHaveCount(0);
});
