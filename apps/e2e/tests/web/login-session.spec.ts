import { expect, test } from "@playwright/test";
import {
  FAKE_ACCESS_TOKEN,
  FAKE_REFRESH_TOKEN,
  loginReply,
  mockApi,
  readableSecrets,
  userFixture,
} from "../helpers/mock-api";

const LOGIN_URL = /\/(en\/)?login(\?|$)/;

test("email login keeps tokens out of page-readable storage", async ({
  page,
  context,
}) => {
  const calls = await mockApi(page, [
    {
      method: "POST",
      path: "/api/v1/auth/email/login",
      reply: {
        ...loginReply(),
        headers: {
          "set-cookie": `refresh_token=${FAKE_REFRESH_TOKEN}; Path=/; HttpOnly; SameSite=Lax`,
        },
      },
    },
    { method: "GET", path: "/api/v1/auth/me", reply: { json: userFixture() } },
  ]);

  await page.goto("/en/login");
  await page.locator("#email").fill("e2e.user@example.test");
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Ada Lovelace" }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.path === "/api/v1/auth/email/login")?.body,
  ).toEqual({
    email: "e2e.user@example.test",
    password: "password123",
  });
  // The access token only travels in the Authorization header.
  expect(calls.find((c) => c.path === "/api/v1/auth/me")?.authorization).toBe(
    `Bearer ${FAKE_ACCESS_TOKEN}`,
  );

  // The refresh cookie exists but JavaScript cannot read it.
  const cookie = (await context.cookies()).find(
    (c) => c.name === "refresh_token",
  );
  expect(cookie?.httpOnly).toBe(true);

  const exposed = JSON.stringify(await readableSecrets(page));
  expect(exposed).not.toContain(FAKE_ACCESS_TOKEN);
  expect(exposed).not.toContain(FAKE_REFRESH_TOKEN);
  expect(exposed).not.toContain("password123");
});

test("failed login shows the server message without leaking internals", async ({
  page,
}) => {
  await mockApi(page, [
    {
      method: "POST",
      path: "/api/v1/auth/email/login",
      reply: {
        status: 422,
        json: {
          message: "Invalid credentials",
          stack: "Error: at AuthService.validateLogin (auth.service.ts:42)",
        },
      },
    },
  ]);

  await page.goto("/en/login");
  await page.locator("#email").fill("e2e.user@example.test");
  await page.locator("#password").fill("wrong-password1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Invalid credentials",
  );
  await expect(page.getByText("AuthService")).toHaveCount(0);
  await expect(page).toHaveURL(LOGIN_URL);
});

test("home without a valid session redirects to login", async ({ page }) => {
  const calls = await mockApi(page, [
    {
      method: "POST",
      path: "/api/v1/auth/refresh",
      reply: { status: 401, json: { message: "Unauthorized" } },
    },
  ]);

  await page.goto("/en");
  await expect(page).toHaveURL(LOGIN_URL);
  expect(calls.some((c) => c.path === "/api/v1/auth/me")).toBe(false);
  await expect(page.getByText("Hello,")).toHaveCount(0);
});

test("session is restored from the refresh cookie, then logout clears it", async ({
  page,
}) => {
  let loggedOut = false;
  const calls = await mockApi(page, [
    {
      method: "POST",
      path: "/api/v1/auth/refresh",
      reply: () =>
        loggedOut
          ? { status: 401, json: { message: "Unauthorized" } }
          : loginReply(),
    },
    { method: "GET", path: "/api/v1/auth/me", reply: { json: userFixture() } },
    {
      method: "POST",
      path: "/api/v1/auth/logout",
      reply: () => {
        loggedOut = true;
        return { status: 204 };
      },
    },
  ]);

  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Ada Lovelace" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(LOGIN_URL);
  expect(
    calls.find((c) => c.path === "/api/v1/auth/logout")?.authorization,
  ).toBe(`Bearer ${FAKE_ACCESS_TOKEN}`);

  // The in-memory token is gone: going home again must not show the user.
  await page.goto("/en");
  await expect(page).toHaveURL(LOGIN_URL);
});

test("login only requires a password, not the registration length rule", async ({
  page,
}) => {
  const calls = await mockApi(page, [
    {
      method: "POST",
      path: "/api/v1/auth/email/login",
      reply: { status: 422, json: { message: "Invalid credentials" } },
    },
  ]);

  await page.goto("/en/login");
  await page.locator("#email").fill("e2e.user@example.test");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Password is required")).toBeVisible();
  expect(calls.some((c) => c.path === "/api/v1/auth/email/login")).toBe(false);

  // Older accounts may have shorter passwords; the API decides, not the form.
  await page.locator("#password").fill("short");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  expect(
    calls.find((c) => c.path === "/api/v1/auth/email/login")?.body,
  ).toEqual({ email: "e2e.user@example.test", password: "short" });
});
