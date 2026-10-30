import { test } from "@playwright/test";
import { expectSecurityHeaders } from "../helpers/headers";

for (const path of ["/en/login", "/en", "/auth/google/callback"]) {
  test(`security headers on ${path}`, async ({ request }) => {
    expectSecurityHeaders(await request.get(path));
  });
}
