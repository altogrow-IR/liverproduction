import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5186",
    channel: "msedge",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
