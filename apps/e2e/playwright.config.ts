import { defineConfig, devices } from "@playwright/test";
import { ADMIN_URL, API_URL, WEB_URL } from "./tests/helpers/urls";

// Layer 2 (real local API) is opt-in: it needs the throwaway docker DB/Redis
// started by scripts/api-up.sh. Default runs only mock the API in the browser.
const withApi = process.env.E2E_API === "1";

// Pin the API URL so browser-side mocks always match, whatever the app .env says.
const appEnv = { NEXT_PUBLIC_API_URL: API_URL };

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  projects: [
    { name: "web", testDir: "tests/web", use: { baseURL: WEB_URL } },
    { name: "admin", testDir: "tests/admin", use: { baseURL: ADMIN_URL } },
    ...(withApi
      ? [
          {
            name: "api",
            testDir: "tests/api",
            use: { baseURL: API_URL },
            // Specs share seed users, and "revoke all sessions" is global per
            // user, so parallel workers would revoke each other's sessions.
            fullyParallel: false,
            workers: 1,
          },
        ]
      : []),
  ],
  webServer: withApi
    ? undefined
    : [
        {
          command: "pnpm --filter web dev",
          url: WEB_URL,
          env: appEnv,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          command: "pnpm --filter admin dev",
          url: `${ADMIN_URL}/login`,
          env: appEnv,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
});
