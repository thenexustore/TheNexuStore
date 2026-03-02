import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/mobile-smoke",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "Mobile Chrome Pixel 5",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari iPhone 12",
      use: { ...devices["iPhone 12"] },
    },
    {
      name: "Mobile Safari iPhone 13",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 0.0.0.0 --port 3000",
    url: "http://127.0.0.1:3000/es/store",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
