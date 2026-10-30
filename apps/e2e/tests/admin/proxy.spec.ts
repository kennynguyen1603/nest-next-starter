import { expect, test } from "@playwright/test";

test("protected routes redirect to login and remember the target", async ({
  request,
}) => {
  for (const path of [
    "/",
    "/users",
    "/settings",
    "/reports",
    "/notifications",
  ]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(307);
    const location = new URL(res.headers()["location"]!, "http://x");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("from")).toBe(path);
  }
});

test("login page sends an existing session to the dashboard", async ({
  request,
}) => {
  const res = await request.get("/login", {
    maxRedirects: 0,
    headers: { cookie: "refresh_token=anything" },
  });
  expect(res.status()).toBe(307);
  expect(new URL(res.headers()["location"]!, "http://x").pathname).toBe("/");
});

test("browser lands on login when opening a dashboard page", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?from=%2Fsettings$/);
  await expect(
    page.getByRole("heading", { name: "Admin Login" }),
  ).toBeVisible();
});
