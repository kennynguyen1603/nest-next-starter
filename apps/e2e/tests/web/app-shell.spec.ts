import { expect, test } from "@playwright/test";
import {
  loginReply,
  mockApi,
  sessionRoutes,
  userFixture,
} from "../helpers/mock-api";

test("header shows the section nav with Overview marked active", async ({
  page,
}) => {
  await mockApi(page, sessionRoutes());
  await page.goto("/en");

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link")).toHaveText([
    "Overview",
    "Notifications",
    "Security",
  ]);
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Security" })).toHaveAttribute(
    "href",
    "/en/security",
  );
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("switching language keeps the shell and translates the nav", async ({
  page,
}) => {
  await mockApi(page, sessionRoutes());
  await page.goto("/en");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page.getByRole("combobox").selectOption("vi");
  await expect(page).toHaveURL(/\/vi$/);
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav.getByRole("link")).toHaveText([
    "Tổng quan",
    "Thông báo",
    "Bảo mật",
  ]);
  await expect(nav.getByRole("link", { name: "Tổng quan" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("refresh succeeds but the first profile fetch fails: shell fetches it again", async ({
  page,
}) => {
  let meCalls = 0;
  const calls = await mockApi(page, [
    { method: "POST", path: "/api/v1/auth/refresh", reply: loginReply() },
    {
      method: "GET",
      path: "/api/v1/auth/me",
      reply: () =>
        ++meCalls === 1
          ? { status: 500, json: { message: "boom" } }
          : { json: userFixture() },
    },
  ]);

  await page.goto("/en");
  await expect(
    page.getByRole("heading", { name: "Ada Lovelace" }),
  ).toBeVisible();
  expect(calls.filter((c) => c.path === "/api/v1/auth/me").length).toBe(2);
});
