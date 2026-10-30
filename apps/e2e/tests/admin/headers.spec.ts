import { test } from "@playwright/test";
import { expectSecurityHeaders } from "../helpers/headers";

test("login page and redirects send security headers", async ({ request }) => {
  expectSecurityHeaders(await request.get("/login"));
  expectSecurityHeaders(await request.get("/users", { maxRedirects: 0 }));
});
