import { expect, test, type Page } from "@playwright/test";
import { mockApi, sessionRoutes, userFixture } from "../helpers/mock-api";

const stat = (page: Page, label: string) =>
  page.locator("dl > div").filter({ hasText: label }).locator("dd");

test("greets the user and fills the stat cards from the API", async ({
  page,
}) => {
  let unreadQuery: URLSearchParams | undefined;
  await mockApi(page, [
    ...sessionRoutes({ ...userFixture(), createdAt: "2024-03-15T12:00:00Z" }),
    {
      method: "GET",
      path: "/api/v1/notifications",
      reply: (req) => {
        unreadQuery = new URL(req.url()).searchParams;
        return {
          json: { data: [], pagination: { totalRecords: 1234 } },
        };
      },
    },
    {
      method: "GET",
      path: "/api/v1/auth/sessions",
      reply: { json: [{ id: "a", isCurrent: true }, { id: "b" }] },
    },
  ]);
  await page.goto("/en");

  await expect(
    page.getByRole("heading", { level: 1, name: "Hello, Ada Lovelace" }),
  ).toBeVisible();
  await expect(stat(page, "Unread notifications")).toHaveText("1,234");
  await expect(stat(page, "Active sessions")).toHaveText("2");
  await expect(stat(page, "Status")).toHaveText("Active");
  await expect(stat(page, "Joined")).toHaveText("Mar 15, 2024");
  expect(unreadQuery?.get("isRead")).toBe("false");
  expect(unreadQuery?.get("limit")).toBe("1");

  // The account card and delete-account area are still there.
  await expect(page.getByText("Account Information")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete account" }),
  ).toBeVisible();
});

test("a failing stat shows a dash and the page stays put", async ({ page }) => {
  await mockApi(page, [
    ...sessionRoutes(),
    {
      method: "GET",
      path: "/api/v1/notifications",
      reply: { status: 500, json: { message: "boom" } },
    },
    {
      method: "GET",
      path: "/api/v1/auth/sessions",
      reply: { status: 503, json: { message: "down" } },
    },
  ]);
  await page.goto("/en");

  await expect(stat(page, "Unread notifications")).toHaveText("—");
  await expect(stat(page, "Active sessions")).toHaveText("—");
  // The fixture has no createdAt.
  await expect(stat(page, "Joined")).toHaveText("—");
  await expect(stat(page, "Status")).toHaveText("Active");
  await expect(page).toHaveURL(/\/en$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hello, Ada Lovelace" }),
  ).toBeVisible();
});

test("quick links point at notifications and security", async ({ page }) => {
  await mockApi(page, sessionRoutes());
  await page.goto("/en");

  const links = page.getByRole("region", { name: "Quick links" });
  await expect(links.getByRole("link", { name: /^Security/ })).toHaveAttribute(
    "href",
    "/en/security",
  );

  await links.getByRole("link", { name: /^Notifications/ }).click();
  await expect(page).toHaveURL(/\/en\/notifications$/);
});

test("dashboard is translated in Vietnamese", async ({ page }) => {
  await mockApi(page, sessionRoutes());
  await page.goto("/vi");

  await expect(
    page.getByRole("heading", { level: 1, name: "Xin chào, Ada Lovelace" }),
  ).toBeVisible();
  await expect(stat(page, "Thông báo chưa đọc")).toHaveText("—");
  await expect(stat(page, "Phiên đăng nhập")).toHaveText("—");
  await expect(page.getByRole("region", { name: "Lối tắt" })).toBeVisible();
});
