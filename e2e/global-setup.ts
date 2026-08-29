import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

const APP_ENV_PATH = resolve(__dirname, "../server/.env");

// dotenv/config's bare side-effect import defaults to loading ./.env relative to the
// process's cwd, which is NOT e2e/.env.test — load it explicitly by path instead.
dotenv.config({ path: resolve(__dirname, ".env.test"), quiet: true });

function readAppDatabaseUrl(): string | undefined {
  // Read the app's real env file directly rather than trusting process.env — this process
  // never loads server/.env for any other reason, so relying on process.env would make the
  // safety check pass by accident (undefined === undefined) instead of by verifying anything.
  try {
    const contents = readFileSync(APP_ENV_PATH, "utf-8");
    const match = contents.match(/^DATABASE_URL=(.*)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

// SQLAlchemy's `mysql+pymysql://` scheme isn't a real MySQL wire protocol scheme — strip the
// `+pymysql` driver suffix so this URL can be parsed the same way as the app's own for
// comparison, and so mysql2 (which knows nothing about SQLAlchemy dialect prefixes) can use it.
function toPlainMysqlUrl(url: string): string {
  return url.replace(/^mysql\+\w+:\/\//, "mysql://");
}

async function resetAndReseedTestDatabase(testDbUrl: string) {
  const conn = await mysql.createConnection({ uri: toPlainMysqlUrl(testDbUrl), ssl: {} });

  const [tables] = await conn.query<any[]>(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()"
  );
  if (tables.length > 0) {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const row of tables) {
      await conn.query(`TRUNCATE TABLE \`${row.name}\``);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
  await conn.end();
  console.log(`[global-setup] reset ${tables.length} table(s) in the test database`);

  // Reseed via the app's own idempotent seed script, pointed at the test DB via an env
  // override for this one process only — server/.env itself is never touched.
  const { execSync } = await import("node:child_process");
  execSync("bash -lc 'source .venv/bin/activate && python -m app.seed'", {
    cwd: resolve(__dirname, "../server"),
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "inherit",
  });
}

export default async function globalSetup() {
  const appDbUrl = readAppDatabaseUrl();
  const testDbUrl = process.env["TEST_DATABASE_URL"];

  if (!testDbUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set (expected in e2e/.env.test) — refusing to run without an explicit test database."
    );
  }
  if (appDbUrl && appDbUrl === testDbUrl) {
    throw new Error(
      "REFUSING TO RUN: TEST_DATABASE_URL is identical to the app's real DATABASE_URL " +
      `(read from ${APP_ENV_PATH}). The e2e suite must use a dedicated test database.`
    );
  }
  if (!appDbUrl) {
    console.warn(
      `[global-setup] WARNING: could not read ${APP_ENV_PATH} to compare against TEST_DATABASE_URL — ` +
      "proceeding on trust. Verify e2e/.env.test manually."
    );
  }

  console.log("[global-setup] test DB confirmed distinct from the app's real database — resetting and reseeding");
  await resetAndReseedTestDatabase(testDbUrl);
}
