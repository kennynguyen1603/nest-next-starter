import { expect, test, type Page, type Request } from "@playwright/test";
import { mockApi, sessionRoutes } from "../helpers/mock-api";

const NOTIFICATIONS_PATH = "/api/v1/notifications";

const notification = (id: string, isRead: boolean, createdAt: string) => ({
  id,
  type: "info",
  title: `Title ${id}`,
  message: `Message ${id}`,
  isRead,
  createdAt,
});

const rowsFixture = () => [
  notification("n1", false, "2024-03-10T08:00:00Z"),
  notification("n2", true, "2024-03-09T08:00:00Z"),
  notification("n3", false, "2024-03-08T08:00:00Z"),
];

type Row = ReturnType<typeof notification>;

const listReply = (data: Row[], currentPage = 1, totalPages = 1) => ({
  json: {
    data,
    pagination: {
      currentPage,
      totalPages,
      totalRecords: totalPages > 1 ? totalPages * 20 : data.length,
      nextPage: currentPage < totalPages ? currentPage + 1 : undefined,
      previousPage: currentPage > 1 ? currentPage - 1 : undefined,
    },
  },
});

/**
 * The list and the unread badge share one path: the badge asks for limit=1,
 * the list for a full page. List queries are recorded in order; a repeat of
 * the previous query is dropped because dev-mode StrictMode runs the mount
 * effect twice.
 */
function getRoute(
  list: (q: URLSearchParams) => ReturnType<typeof listReply>,
  unread = 2,
) {
  const queries: URLSearchParams[] = [];
  const raw: URLSearchParams[] = [];
  const route = {
    method: "GET",
    path: NOTIFICATIONS_PATH,
    reply: (req: Request) => {
      const q = new URL(req.url()).searchParams;
      if (q.get("limit") === "1") {
        return { json: { data: [], pagination: { totalRecords: unread } } };
      }
      raw.push(q);
      if (queries.at(-1)?.toString() !== q.toString()) queries.push(q);
      return list(q);
    },
  };
  return { queries, raw, route };
}

const unreadOnly = (q: URLSearchParams) =>
  listReply(
    q.get("isRead") === "false"
      ? rowsFixture().filter((n) => !n.isRead)
      : rowsFixture(),
  );

const card = (page: Page) =>
  page.getByRole("region", { name: "Notifications" });
const rows = (page: Page) => card(page).getByRole("listitem");
const row = (page: Page, id: string) =>
  rows(page).filter({ hasText: `Title ${id}` });
const badge = (page: Page) => page.getByText(/^\d+ unread$/);

test("lists notifications with an unread badge inside the app shell", async ({
  page,
}) => {
  const recent = new Date(Date.now() - 3 * 3_600_000).toISOString();
  const { queries, route } = getRoute(() =>
    listReply([notification("n0", false, recent), ...rowsFixture()]),
  );
  await mockApi(page, [...sessionRoutes(), route]);
  await page.goto("/en/notifications");

  await expect(
    page.getByRole("heading", { level: 1, name: "Notifications" }),
  ).toBeVisible();
  await expect(rows(page)).toHaveCount(4);
  await expect(badge(page)).toHaveText("2 unread");

  // Recent items get a relative time, older ones a date.
  await expect(row(page, "n0")).toContainText("3h ago");
  await expect(row(page, "n1")).toContainText("Mar 10, 2024");
  await expect(row(page, "n1")).toContainText("Message n1");

  // Only unread rows offer "Mark as read"; every row can be deleted.
  await expect(
    card(page).getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(3);
  await expect(row(page, "n2").getByRole("button")).toHaveText(["Delete"]);
  await expect(card(page).getByRole("button", { name: "Delete" })).toHaveCount(
    4,
  );

  await expect(
    page.getByRole("button", { name: "All", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(queries).toHaveLength(1);
  expect(queries[0]!.get("page")).toBe("1");
  expect(queries[0]!.get("limit")).toBe("20");
  expect(queries[0]!.has("isRead")).toBe(false);

  // The shell replaces the page's own back link.
  await expect(page.getByRole("button", { name: /←/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /←/ })).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Notifications" }),
  ).toHaveAttribute("aria-current", "page");
});

test("the Unread tab asks the API for unread items only", async ({ page }) => {
  const { queries, raw, route } = getRoute(unreadOnly);
  await mockApi(page, [...sessionRoutes(), route]);
  await page.goto("/en/notifications");
  await expect(rows(page)).toHaveCount(3);

  await page.getByRole("button", { name: "Unread" }).click();

  await expect(rows(page)).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Unread" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "All", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect(queries).toHaveLength(2);
  expect(queries[1]!.get("isRead")).toBe("false");
  expect(queries[1]!.get("page")).toBe("1");

  // Clicking the active tab does not refetch: only the All click does.
  const before = raw.length;
  await page.getByRole("button", { name: "Unread" }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(rows(page)).toHaveCount(3);
  expect(raw).toHaveLength(before + 1);
  expect(queries).toHaveLength(3);
  expect(queries[2]!.has("isRead")).toBe(false);
});

test("an empty Unread tab says so", async ({ page }) => {
  const { route } = getRoute(
    (q) => listReply(q.get("isRead") === "false" ? [] : rowsFixture()),
    0,
  );
  await mockApi(page, [...sessionRoutes(), route]);
  await page.goto("/en/notifications");

  await page.getByRole("button", { name: "Unread" }).click();
  await expect(card(page)).toContainText("No unread notifications");
  await expect(rows(page)).toHaveCount(0);
  // Nothing unread: no badge and nothing to mark.
  await expect(badge(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
});

test("marking one as read updates the row and the badge", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "PATCH",
      path: `${NOTIFICATIONS_PATH}/n1/read`,
      reply: { json: {} },
    },
  ]);
  await page.goto("/en/notifications");

  await row(page, "n1").getByRole("button", { name: "Mark as read" }).click();

  await expect(
    row(page, "n1").getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);
  await expect(badge(page)).toHaveText("1 unread");
  const patches = calls.filter((c) => c.method === "PATCH");
  expect(patches.map((c) => c.path)).toEqual([`${NOTIFICATIONS_PATH}/n1/read`]);
  expect(patches[0]!.authorization).toMatch(/^Bearer /);
});

test("on the Unread tab a read item leaves the list", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "PATCH",
      path: `${NOTIFICATIONS_PATH}/n1/read`,
      reply: { json: {} },
    },
  ]);
  await page.goto("/en/notifications");
  await page.getByRole("button", { name: "Unread" }).click();
  await expect(rows(page)).toHaveCount(2);

  await row(page, "n1").getByRole("button", { name: "Mark as read" }).click();

  await expect(row(page, "n1")).toHaveCount(0);
  await expect(rows(page)).toHaveCount(1);
  await expect(badge(page)).toHaveText("1 unread");
});

test("a failed mark as read keeps the row unread and shows an error", async ({
  page,
}) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "PATCH",
      path: `${NOTIFICATIONS_PATH}/n1/read`,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/notifications");

  const markRead = row(page, "n1").getByRole("button", {
    name: "Mark as read",
  });
  await markRead.click();

  await expect(card(page).getByRole("alert")).toHaveText(
    "Could not mark that notification as read. Please try again.",
  );
  await expect(markRead).toBeEnabled();
  await expect(badge(page)).toHaveText("2 unread");
});

test("deleting a notification removes it", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    route,
    { method: "DELETE", path: `${NOTIFICATIONS_PATH}/n1`, reply: { json: {} } },
    { method: "DELETE", path: `${NOTIFICATIONS_PATH}/n2`, reply: { json: {} } },
  ]);
  await page.goto("/en/notifications");

  // An unread one lowers the badge...
  await row(page, "n1").getByRole("button", { name: "Delete" }).click();
  await expect(row(page, "n1")).toHaveCount(0);
  await expect(badge(page)).toHaveText("1 unread");

  // ...a read one does not.
  await row(page, "n2").getByRole("button", { name: "Delete" }).click();
  await expect(row(page, "n2")).toHaveCount(0);
  await expect(rows(page)).toHaveCount(1);
  await expect(badge(page)).toHaveText("1 unread");

  await expect(card(page).getByRole("alert")).toHaveCount(0);
  expect(calls.filter((c) => c.method === "DELETE").map((c) => c.path)).toEqual(
    [`${NOTIFICATIONS_PATH}/n1`, `${NOTIFICATIONS_PATH}/n2`],
  );
});

test("a failed delete keeps the row and shows an error", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "DELETE",
      path: `${NOTIFICATIONS_PATH}/n2`,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/notifications");

  const del = row(page, "n2").getByRole("button", { name: "Delete" });
  await del.click();

  await expect(card(page).getByRole("alert")).toHaveText(
    "Could not delete that notification. Please try again.",
  );
  await expect(rows(page)).toHaveCount(3);
  await expect(del).toBeEnabled();
});

test("deleting the last row of a page loads the previous page", async ({
  page,
}) => {
  const { queries, route } = getRoute((q) =>
    q.get("page") === "2"
      ? listReply([notification("p2", true, "2024-03-01T08:00:00Z")], 2, 2)
      : listReply(rowsFixture(), 1, 2),
  );
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    { method: "DELETE", path: `${NOTIFICATIONS_PATH}/p2`, reply: { json: {} } },
  ]);
  await page.goto("/en/notifications");
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(rows(page)).toHaveCount(1);

  await row(page, "p2").getByRole("button", { name: "Delete" }).click();

  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  expect(queries.map((q) => q.get("page"))).toEqual(["1", "2", "1"]);
});

test("mark all read clears every unread marker", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "PATCH",
      path: `${NOTIFICATIONS_PATH}/read-all`,
      reply: { json: {} },
    },
  ]);
  await page.goto("/en/notifications");

  await page.getByRole("button", { name: "Mark all read" }).click();

  await expect(
    card(page).getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);
  await expect(badge(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  expect(calls.filter((c) => c.method === "PATCH").map((c) => c.path)).toEqual([
    `${NOTIFICATIONS_PATH}/read-all`,
  ]);
});

test("mark all read on the Unread tab empties it", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "PATCH",
      path: `${NOTIFICATIONS_PATH}/read-all`,
      reply: { json: {} },
    },
  ]);
  await page.goto("/en/notifications");
  await page.getByRole("button", { name: "Unread" }).click();
  await expect(rows(page)).toHaveCount(2);

  await page.getByRole("button", { name: "Mark all read" }).click();

  await expect(rows(page)).toHaveCount(0);
  await expect(card(page)).toContainText("No unread notifications");
});

test("a failed mark all read changes nothing and shows an error", async ({
  page,
}) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "PATCH",
      path: `${NOTIFICATIONS_PATH}/read-all`,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/notifications");

  await page.getByRole("button", { name: "Mark all read" }).click();

  await expect(card(page).getByRole("alert")).toHaveText(
    "Could not mark all notifications as read. Please try again.",
  );
  await expect(
    card(page).getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(2);
  await expect(badge(page)).toHaveText("2 unread");
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeEnabled();
});

test("clear all asks first and can be cancelled", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    route,
    { method: "DELETE", path: NOTIFICATIONS_PATH, reply: { json: {} } },
  ]);
  await page.goto("/en/notifications");

  await page.getByRole("button", { name: "Clear all" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Clear all notifications?");
  await expect(dialog).toContainText("This cannot be undone.");

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(rows(page)).toHaveCount(3);

  // Escape also closes it without calling the API.
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
});

test("confirming clear all empties the list", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  const calls = await mockApi(page, [
    ...sessionRoutes(),
    route,
    { method: "DELETE", path: NOTIFICATIONS_PATH, reply: { json: {} } },
  ]);
  await page.goto("/en/notifications");

  await page.getByRole("button", { name: "Clear all" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear all" })
    .click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rows(page)).toHaveCount(0);
  await expect(card(page)).toContainText("No notifications");
  await expect(badge(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear all" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  expect(calls.filter((c) => c.method === "DELETE").map((c) => c.path)).toEqual(
    [NOTIFICATIONS_PATH],
  );
});

test("a failed clear all keeps every row and shows an error", async ({
  page,
}) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [
    ...sessionRoutes(),
    route,
    {
      method: "DELETE",
      path: NOTIFICATIONS_PATH,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/notifications");

  await page.getByRole("button", { name: "Clear all" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear all" })
    .click();

  await expect(card(page).getByRole("alert")).toHaveText(
    "Could not clear your notifications. Please try again.",
  );
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Clear all" })).toBeEnabled();
});

test("pages through results", async ({ page }) => {
  const { queries, route } = getRoute((q) => {
    const n = Number(q.get("page"));
    return listReply(
      [notification(`p${n}`, true, "2024-03-01T08:00:00Z")],
      n,
      3,
    );
  });
  await mockApi(page, [...sessionRoutes(), route]);
  await page.goto("/en/notifications");

  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "← Previous" })).toBeDisabled();

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await expect(row(page, "p2")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "← Previous" })).toBeEnabled();

  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Page 3 of 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next →" })).toBeDisabled();

  await page.getByRole("button", { name: "← Previous" }).click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  expect(queries.map((q) => q.get("page"))).toEqual(["1", "2", "3", "2"]);

  // Switching tabs starts again from page 1.
  await page.getByRole("button", { name: "Unread" }).click();
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  expect(queries.at(-1)!.get("page")).toBe("1");
  expect(queries.at(-1)!.get("isRead")).toBe("false");
});

test("a failed load shows an error instead of the list", async ({ page }) => {
  await mockApi(page, [
    ...sessionRoutes(),
    {
      method: "GET",
      path: NOTIFICATIONS_PATH,
      reply: { status: 500, json: { message: "boom" } },
    },
  ]);
  await page.goto("/en/notifications");

  await expect(card(page).getByRole("alert")).toHaveText(
    "Failed to load notifications.",
  );
  await expect(rows(page)).toHaveCount(0);
  await expect(badge(page)).toHaveCount(0);
  // Bulk actions stay off: there is nothing on screen for them to act on.
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clear all" })).toBeDisabled();
  await expect(page).toHaveURL(/\/en\/notifications$/);
});

test("try again reloads the list after a failed load", async ({ page }) => {
  const { queries, route } = getRoute(unreadOnly);
  let failing = true;
  await mockApi(page, [
    ...sessionRoutes(),
    {
      ...route,
      reply: (req) =>
        failing && new URL(req.url()).searchParams.get("limit") !== "1"
          ? { status: 500, json: { message: "boom" } }
          : route.reply(req),
    },
  ]);
  await page.goto("/en/notifications");

  await expect(card(page).getByRole("alert")).toHaveText(
    "Failed to load notifications.",
  );
  failing = false;
  await card(page).getByRole("button", { name: "Try again" }).click();

  await expect(rows(page)).toHaveCount(3);
  await expect(card(page).getByRole("alert")).toHaveCount(0);
  await expect(
    card(page).getByRole("button", { name: "Try again" }),
  ).toHaveCount(0);
  // One retry, for the same page and filter as the failed request.
  expect(queries).toHaveLength(1);
  expect(queries[0]!.get("page")).toBe("1");
  expect(queries[0]!.get("isRead")).toBeNull();
});

test("bulk actions wait for the list to load", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [...sessionRoutes(), route]);
  // Hold the list request (not the badge) until the test releases it.
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route(
    (url) =>
      url.pathname === NOTIFICATIONS_PATH &&
      url.searchParams.get("limit") !== "1",
    async (r) => {
      if (r.request().method() === "GET") await held;
      await r.fallback();
    },
  );
  await page.goto("/en/notifications");

  await expect(
    card(page).getByRole("status", { name: "Loading…" }),
  ).toBeVisible();
  await expect(badge(page)).toHaveText("2 unread");
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clear all" })).toBeDisabled();

  release();
  await expect(rows(page)).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Clear all" })).toBeEnabled();
});

test("notifications page is translated in Vietnamese", async ({ page }) => {
  const { route } = getRoute(unreadOnly);
  await mockApi(page, [...sessionRoutes(), route]);
  await page.goto("/vi/notifications");

  await expect(
    page.getByRole("heading", { level: 1, name: "Thông báo" }),
  ).toBeVisible();
  await expect(page.getByText("2 chưa đọc")).toBeVisible();
  const region = page.getByRole("region", { name: "Thông báo" });
  await expect(region.getByRole("button", { name: "Tất cả" })).toBeVisible();
  await expect(region.getByRole("button", { name: "Chưa đọc" })).toBeVisible();
  await expect(
    region.getByRole("button", { name: "Đánh dấu đã đọc" }),
  ).toHaveCount(2);
  await expect(region.getByRole("button", { name: "Xóa" })).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa tất cả" })).toBeVisible();
});
