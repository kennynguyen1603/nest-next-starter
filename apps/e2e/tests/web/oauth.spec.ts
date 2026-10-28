import { expect, test, type Page } from "@playwright/test";
import { loginReply, mockApi, userFixture } from "../helpers/mock-api";
import { WEB_URL } from "../helpers/urls";

const CALLBACK = "/auth/google/callback";

async function seedState(page: Page, state: string | null) {
  // sessionStorage is per tab + origin, so seed it on any page of the app first.
  await page.goto("/en/login");
  await page.evaluate((s) => {
    if (s === null) sessionStorage.removeItem("oauth_state");
    else sessionStorage.setItem("oauth_state", s);
  }, state);
}

const storedState = (page: Page) =>
  page.evaluate(() => sessionStorage.getItem("oauth_state"));

test("google sign-in sends a fresh, stored state and the app callback URL", async ({
  page,
}) => {
  // Never reach the real provider: answer the authorize request locally.
  let authorizeUrl: URL | undefined;
  await page.route("https://accounts.google.com/**", (route) => {
    authorizeUrl = new URL(route.request().url());
    return route.fulfill({
      contentType: "text/html",
      body: "<p>provider stub</p>",
    });
  });

  await page.goto("/en/login");
  await page.getByRole("button", { name: "Google" }).click();
  await expect(page.getByText("provider stub")).toBeVisible();

  const params = authorizeUrl!.searchParams;
  expect(params.get("response_type")).toBe("code");
  expect(params.get("redirect_uri")).toBe(`${WEB_URL}${CALLBACK}`);
  const state = params.get("state");
  expect(state).toMatch(/^[0-9a-f-]{36}$/);

  // The provider page is cross-origin; check the stored value back on our origin.
  await page.goto("/en/login");
  expect(await storedState(page)).toBe(state);
});

test("callback without a code is rejected", async ({ page }) => {
  await page.goto(`${CALLBACK}?state=x`);
  await expect(page).toHaveURL(/\/(en\/)?login\?error=no_code$/);
});

test("provider error is forwarded as text, not markup", async ({ page }) => {
  await page.goto(`${CALLBACK}?error=access_denied`);
  await expect(page).toHaveURL(/\/(en\/)?login\?error=access_denied$/);
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "access denied",
  );
});

for (const [name, saved, returned] of [
  ["missing returned state", "expected-state", null],
  ["mismatched state", "expected-state", "attacker-state"],
  ["no stored state", null, "attacker-state"],
] as const) {
  test(`callback with ${name} never exchanges the code`, async ({ page }) => {
    let exchanged = false;
    await page.route("**/api/auth/*/exchange", (route) => {
      exchanged = true;
      return route.fulfill({ status: 500, json: {} });
    });

    await seedState(page, saved);
    const qs = new URLSearchParams({ code: "stolen-code" });
    if (returned) qs.set("state", returned);
    await page.goto(`${CALLBACK}?${qs}`);

    await expect(page).toHaveURL(/\/(en\/)?login\?error=invalid_state$/);
    expect(exchanged).toBe(false);
    // State is single-use: it is consumed even on failure.
    expect(await storedState(page)).toBeNull();
  });
}

test("valid state exchanges the code once and restores the session", async ({
  page,
}) => {
  const exchangeBodies: unknown[] = [];
  await page.route("**/api/auth/google/exchange", (route) => {
    exchangeBodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await mockApi(page, [
    { method: "POST", path: "/api/v1/auth/refresh", reply: loginReply() },
    { method: "GET", path: "/api/v1/auth/me", reply: { json: userFixture() } },
  ]);

  await seedState(page, "good-state");
  await page.goto(`${CALLBACK}?code=auth-code&state=good-state`);

  await expect(
    page.getByRole("heading", { name: "Ada Lovelace" }),
  ).toBeVisible();
  expect(exchangeBodies).toEqual([{ code: "auth-code" }]);
  expect(await storedState(page)).toBeNull();
});

test("failed exchange sends the user back to login with the error", async ({
  page,
}) => {
  await page.route("**/api/auth/google/exchange", (route) =>
    route.fulfill({ status: 401, json: { error: "account_disabled" } }),
  );

  await seedState(page, "good-state");
  await page.goto(`${CALLBACK}?code=auth-code&state=good-state`);

  await expect(page).toHaveURL(/\/(en\/)?login\?error=account_disabled$/);
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "account disabled",
  );
});
