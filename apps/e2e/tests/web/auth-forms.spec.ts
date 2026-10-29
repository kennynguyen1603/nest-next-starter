import { expect, test } from "@playwright/test";
import { mockApi } from "../helpers/mock-api";

test.describe("auth form validation", () => {
  test("login rejects invalid input before calling the API", async ({
    page,
  }) => {
    const calls = await mockApi(page, []);
    await page.goto("/en/login");
    await page.locator("#email").fill("not-an-email");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    expect(
      calls.filter((c) => c.path === "/api/v1/auth/email/login"),
    ).toHaveLength(0);
  });

  test("register enforces required fields and password complexity", async ({
    page,
  }) => {
    const calls = await mockApi(page, []);
    await page.goto("/en/register");
    await page.locator("#email").fill("bad");
    await page.locator("#password").fill("onlyletters");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("First name is required")).toBeVisible();
    await expect(page.getByText("Last name is required")).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(
      page.getByText(
        "Password must contain at least one letter and one number",
      ),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  test("forgot password shows the same success message for any email", async ({
    page,
  }) => {
    // No account enumeration: the UI must not reveal whether the email exists.
    const calls = await mockApi(page, [
      {
        method: "POST",
        path: "/api/v1/auth/forgot/password",
        reply: { status: 204 },
      },
    ]);
    await page.goto("/en/forgot-password");
    await page.locator("#email").fill("nobody@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText("Check your email")).toBeVisible();
    expect(calls).toEqual([
      expect.objectContaining({
        method: "POST",
        path: "/api/v1/auth/forgot/password",
        body: { email: "nobody@example.test" },
      }),
    ]);
  });

  test("reset password without a hash refuses to render the form", async ({
    page,
  }) => {
    await page.goto("/en/reset-password");
    await expect(page.getByText("Invalid reset link.")).toBeVisible();
    await expect(page.locator("#password")).toHaveCount(0);
  });

  test("reset password validates the new password", async ({ page }) => {
    const calls = await mockApi(page, []);
    await page.goto("/en/reset-password?hash=e2e-hash");
    await page.locator("#password").fill("12345678");
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(
      page.getByText(
        "Password must contain at least one letter and one number",
      ),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
  });
});

test("login ?error= is rendered as text, never as HTML", async ({ page }) => {
  // No underscores: the page turns "_" into spaces, which would defuse the payload.
  const payload = '<img src=x onerror="window.pwned=1">';
  await page.goto(`/en/login?error=${encodeURIComponent(payload)}`);

  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toHaveText(payload);
  await expect(page.locator("img[src=x]")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as { pwned?: number }).pwned),
  ).toBeUndefined();
});
