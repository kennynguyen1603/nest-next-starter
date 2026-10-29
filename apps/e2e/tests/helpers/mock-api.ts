import type { Page, Request } from "@playwright/test";
import { API_URL } from "./urls";

type Reply = {
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
};
type Route = {
  method: string;
  path: string;
  reply: Reply | ((req: Request) => Reply);
};
export type ApiCall = {
  method: string;
  path: string;
  authorization?: string;
  body: unknown;
};

/**
 * Intercepts every browser request to the NestJS API so no test ever reaches a
 * real backend. Unknown endpoints answer 404 and are still recorded, so a test
 * can assert exactly which calls the UI made.
 */
export async function mockApi(page: Page, routes: Route[]) {
  const calls: ApiCall[] = [];

  await page.route(`${API_URL}/**`, async (route) => {
    const req = route.request();
    const origin = req.headers()["origin"] ?? "";
    // Credentialed CORS: exact origin echo + allow-credentials, like the real API.
    const cors = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      vary: "Origin",
    };

    if (req.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          ...cors,
          "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE",
          "access-control-allow-headers":
            "content-type,authorization,x-custom-lang",
        },
      });
    }

    const path = new URL(req.url()).pathname;
    calls.push({
      method: req.method(),
      path,
      authorization: req.headers()["authorization"],
      body: req.postDataJSON?.() ?? null,
    });

    const match = routes.find(
      (r) => r.method === req.method() && r.path === path,
    );
    const reply = match
      ? typeof match.reply === "function"
        ? match.reply(req)
        : match.reply
      : { status: 404, json: { message: "Not Found" } };

    return route.fulfill({
      status: reply.status ?? 200,
      contentType: "application/json",
      headers: { ...cors, ...reply.headers },
      body: JSON.stringify(reply.json ?? {}),
    });
  });

  return calls;
}

// Recognisable, fake secrets: if either ever shows up in storage or the DOM, it leaked.
export const FAKE_ACCESS_TOKEN = "e2e.fake-access-token.do-not-leak";
export const FAKE_REFRESH_TOKEN = "e2e-fake-refresh-token-do-not-leak";

export const userFixture = (roles: string[] = ["user"]) => ({
  id: "7",
  email: "e2e.user@example.test",
  firstName: "Ada",
  lastName: "Lovelace",
  provider: "email",
  photo: null,
  status: "active",
  roles: roles.map((name, i) => ({ id: String(i + 1), name })),
});

export const loginReply = () => ({
  json: {
    token: FAKE_ACCESS_TOKEN,
    tokenExpires: Date.now() + 15 * 60_000,
  },
});

/** Collects every place a token could be readable from page JavaScript. */
export async function readableSecrets(page: Page) {
  return page.evaluate(() => ({
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
    cookies: document.cookie,
    html: document.documentElement.outerHTML,
  }));
}

/** Routes that let the app shell restore a signed-in session from the refresh cookie. */
export const sessionRoutes = (user = userFixture()) => [
  { method: "POST", path: "/api/v1/auth/refresh", reply: loginReply() },
  { method: "GET", path: "/api/v1/auth/me", reply: { json: user } },
];
