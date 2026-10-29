import { expect, test, type Page } from "@playwright/test";
import { mockApi, sessionRoutes } from "../helpers/mock-api";

const SESSIONS_PATH = "/api/v1/auth/sessions";

const sessionsFixture = () => [
  {
    id: 11,
    deviceName: "Firefox 121 on Windows",
    ipAddress: "203.0.113.9",
    lastUsedAt: "2024-03-10T08:00:00Z",
    createdAt: "2024-03-01T08:00:00Z",
    isCurrent: false,
  },
  {
    id: 10,
    deviceName: "Chrome 120 on macOS",
    ipAddress: "198.51.100.4",
    lastUsedAt: "2024-03-01T08:00:00Z",
    createdAt: "2024-03-01T08:00:00Z",
    isCurrent: true,
  },
  {
    id: 12,
    deviceName: "Unknown Device",
    platform: "ios",
    lastUsedAt: "2024-03-12T08:00:00Z",
    createdAt: "2024-03-02T08:00:00Z",
    isCurrent: false,
  },
  {
    id: 13,
    deviceName: "Unknown Device",
    createdAt: "2024-02-01T08:00:00Z",
    isCurrent: false,
  },
];

const card = (page: Page) =>
  page.getByRole("region", { name: "Active sessions" });
const rows = (page: Page) => card(page).getByRole("listitem");

test("lists sessions with the current device first and labelled", async ({
  page,
}) => {
  await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
  ]);
  await page.goto("/en/security");

  await expect(
    page.getByRole("heading", { level: 1, name: "Security" }),
  ).toBeVisible();
  await expect(rows(page)).toHaveCount(4);

  // Current first, then most recently used.
  const current = rows(page).nth(0);
  await expect(current).toContainText("Chrome 120 on macOS");
  await expect(current).toContainText("This device");
  await expect(current).toContainText("IP 198.51.100.4");
  await expect(current).toContainText("Last active Mar 1, 2024");
  await expect(current.getByRole("button")).toHaveCount(0);

  // "Unknown Device" falls back to the platform, then to a generic label.
  await expect(rows(page).nth(1)).toContainText("ios");
  await expect(rows(page).nth(1)).not.toContainText("IP ");
  await expect(rows(page).nth(2)).toContainText("Firefox 121 on Windows");
  await expect(rows(page).nth(2)).toContainText("IP 203.0.113.9");
  await expect(rows(page).nth(3)).toContainText("Unknown device");
  await expect(rows(page).nth(3)).toContainText("Last active Feb 1, 2024");

  await expect(page.getByText("This device")).toHaveCount(1);
  await expect(
    card(page).getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(3);

  // The nav marks Security as the active section.
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Security" }),
  ).toHaveAttribute("aria-current", "page");
});

test("signs out a single other device", async ({ page }) => {
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
    { method: "DELETE", path: `${SESSIONS_PATH}/11`, reply: { json: {} } },
  ]);
  await page.goto("/en/security");

  const firefox = rows(page).filter({ hasText: "Firefox 121 on Windows" });
  await firefox.getByRole("button", { name: "Sign out" }).click();

  await expect(firefox).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);
  await expect(card(page).getByRole("alert")).toHaveCount(0);
  const deletes = calls.filter((c) => c.method === "DELETE");
  expect(deletes.map((c) => c.path)).toEqual([`${SESSIONS_PATH}/11`]);
  expect(deletes[0]!.authorization).toMatch(/^Bearer /);
});

test("a failed single sign-out keeps the row and shows an error", async ({
  page,
}) => {
  await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
    {
      method: "DELETE",
      path: `${SESSIONS_PATH}/11`,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/security");

  const firefox = rows(page).filter({ hasText: "Firefox 121 on Windows" });
  await firefox.getByRole("button", { name: "Sign out" }).click();

  await expect(card(page).getByRole("alert")).toHaveText(
    "Could not sign that device out. Please try again.",
  );
  await expect(firefox).toHaveCount(1);
  await expect(rows(page)).toHaveCount(4);
  // Buttons are usable again once the request settles.
  await expect(firefox.getByRole("button", { name: "Sign out" })).toBeEnabled();
});

test("sign out all other devices asks first and can be cancelled", async ({
  page,
}) => {
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
    { method: "DELETE", path: SESSIONS_PATH, reply: { json: {} } },
  ]);
  await page.goto("/en/security");

  await page
    .getByRole("button", { name: "Sign out all other devices" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Sign out all other devices?");
  await expect(dialog).toContainText(
    "Every other device will have to sign in again.",
  );

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows(page)).toHaveCount(4);

  // Escape also closes it without calling the API.
  await page
    .getByRole("button", { name: "Sign out all other devices" })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
});

test("confirming sign out all keeps only this device", async ({ page }) => {
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
    { method: "DELETE", path: SESSIONS_PATH, reply: { json: {} } },
  ]);
  await page.goto("/en/security");

  await page
    .getByRole("button", { name: "Sign out all other devices" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign out all other devices" })
    .click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("This device");
  await expect(card(page)).toContainText("No other devices are signed in.");
  await expect(
    page.getByRole("button", { name: "Sign out all other devices" }),
  ).toHaveCount(0);
  expect(calls.filter((c) => c.method === "DELETE").map((c) => c.path)).toEqual(
    [SESSIONS_PATH],
  );
});

test("a failed sign out all keeps every row and shows an error", async ({
  page,
}) => {
  await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
    {
      method: "DELETE",
      path: SESSIONS_PATH,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/security");

  await page
    .getByRole("button", { name: "Sign out all other devices" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign out all other devices" })
    .click();

  await expect(card(page).getByRole("alert")).toHaveText(
    "Could not sign out the other devices. Please try again.",
  );
  await expect(rows(page)).toHaveCount(4);
});

test("only the current session shows the empty note", async ({ page }) => {
  await mockApi(page, [
    ...sessionRoutes(),
    {
      method: "GET",
      path: SESSIONS_PATH,
      reply: { json: [sessionsFixture()[1]] },
    },
  ]);
  await page.goto("/en/security");

  await expect(rows(page)).toHaveCount(1);
  await expect(card(page)).toContainText("No other devices are signed in.");
  await expect(
    page.getByRole("button", { name: "Sign out all other devices" }),
  ).toHaveCount(0);
});

test("a failed load shows an error instead of the list", async ({ page }) => {
  await mockApi(page, [
    ...sessionRoutes(),
    {
      method: "GET",
      path: SESSIONS_PATH,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/security");

  await expect(card(page).getByRole("alert")).toHaveText(
    "Failed to load sessions.",
  );
  await expect(rows(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/en\/security$/);
});

test("security page is translated in Vietnamese", async ({ page }) => {
  await mockApi(page, [
    ...sessionRoutes(),
    { method: "GET", path: SESSIONS_PATH, reply: { json: sessionsFixture() } },
  ]);
  await page.goto("/vi/security");

  await expect(
    page.getByRole("heading", { level: 1, name: "Bảo mật" }),
  ).toBeVisible();
  const region = page.getByRole("region", { name: "Phiên đăng nhập" });
  await expect(region.getByRole("listitem").first()).toContainText(
    "Thiết bị này",
  );
  await expect(
    region.getByRole("button", { name: "Đăng xuất mọi thiết bị khác" }),
  ).toBeVisible();
  await expect(region.getByRole("listitem").last()).toContainText(
    "Thiết bị không xác định",
  );
});
