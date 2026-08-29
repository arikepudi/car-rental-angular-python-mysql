import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(__dirname, ".env.test"), quiet: true });

const FRONTEND_PORT = process.env["E2E_FRONTEND_PORT"] ?? "4300";
const BACKEND_PORT = process.env["E2E_BACKEND_PORT"] ?? "8100";
const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];

export default defineConfig({
  testDir: "./tests",
  globalSetup: require.resolve("./global-setup"),

  // Determinism over speed by default: headed mode plus concurrent workers means several
  // visible browser windows racing each other, and worse, real data races between tests
  // that mutate shared seeded rows (e.g. two tests booking the same car). Raise this once
  // every spec is verified independent.
  workers: 1,
  fullyParallel: false,

  // A red result should mean "look at this," not "maybe transient" — no silent retries for
  // local on-demand runs. Raise only for a CI runner, and say so explicitly if so.
  retries: 0,

  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    headless: false, // non-negotiable standing instruction — never flip this for convenience
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      // DATABASE_URL is overridden inline for this one process only — server/.env itself
      // is never read or written by this command.
      command: `bash -lc "source .venv/bin/activate && DATABASE_URL='${TEST_DATABASE_URL}' ENVIRONMENT=development CLIENT_ORIGIN=http://localhost:${FRONTEND_PORT} SESSION_SECRET=e2e-test-secret uvicorn app.main:app --port ${BACKEND_PORT}"`,
      cwd: resolve(__dirname, "../server"),
      url: `http://localhost:${BACKEND_PORT}/api/cars`,
      timeout: 30_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `npx ng serve --port ${FRONTEND_PORT} --proxy-config ../e2e/e2e-proxy.conf.json`,
      cwd: resolve(__dirname, "../client"),
      url: `http://localhost:${FRONTEND_PORT}`,
      timeout: 60_000, // Angular's dev build is slower to first-serve than a Vite app's
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
