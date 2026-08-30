"""Mandatory safety check + reset for the load-test database.

Run before every k6 invocation (perf/run.sh does this automatically) — never invoke
`k6 run` without this having passed first. Refuses to run at all if LOAD_TEST_DATABASE_URL
resolves to the same database as the app's real DATABASE_URL, rather than trusting a one-time
human confirmation, because a load test writes rows fast enough that pointing it at the wrong
database is an immediate flood, not a slow leak to catch later.
"""

import re
import ssl
import sys
from pathlib import Path
from urllib.parse import urlparse

import certifi
import pymysql

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
APP_ENV_PATH = REPO_ROOT / "server" / ".env"
LOAD_TEST_ENV_PATH = REPO_ROOT / "perf" / ".env.loadtest"


def read_env_var(path: Path, key: str) -> str | None:
    try:
        contents = path.read_text()
    except FileNotFoundError:
        return None
    match = re.search(rf"^{key}=(.*)$", contents, re.MULTILINE)
    return match.group(1).strip() if match else None


def to_plain_mysql_url(sqlalchemy_url: str) -> str:
    # Strip SQLAlchemy's "+driver" dialect suffix (e.g. "mysql+pymysql://") so the URL can be
    # parsed as a plain MySQL wire-protocol URL for pymysql's own connect().
    return re.sub(r"^mysql\+\w+://", "mysql://", sqlalchemy_url)


def reset_and_reseed(test_db_url: str) -> None:
    parsed = urlparse(to_plain_mysql_url(test_db_url))
    ctx = ssl.create_default_context(cafile=certifi.where())
    conn = pymysql.connect(
        host=parsed.hostname,
        port=parsed.port or 4000,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path.lstrip("/"),
        ssl=ctx,
        connect_timeout=15,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
            )
            tables = [row[0] for row in cur.fetchall()]
            if tables:
                cur.execute("SET FOREIGN_KEY_CHECKS = 0")
                for table in tables:
                    cur.execute(f"TRUNCATE TABLE `{table}`")
                cur.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()
        print(f"[reset_load_test_db] reset {len(tables)} table(s) in the load-test database")
    finally:
        conn.close()

    import os
    import subprocess

    subprocess.run(
        ["bash", "-lc", "source .venv/bin/activate && python -m app.seed"],
        cwd=REPO_ROOT / "server",
        env={**os.environ, "DATABASE_URL": test_db_url},
        check=True,
    )


def main() -> None:
    app_db_url = read_env_var(APP_ENV_PATH, "DATABASE_URL")
    test_db_url = read_env_var(LOAD_TEST_ENV_PATH, "LOAD_TEST_DATABASE_URL")

    if not test_db_url:
        print(
            f"LOAD_TEST_DATABASE_URL is not set in {LOAD_TEST_ENV_PATH} — "
            "refusing to run without an explicit load-test database.",
            file=sys.stderr,
        )
        sys.exit(1)

    if app_db_url and app_db_url == test_db_url:
        print(
            "REFUSING TO RUN: LOAD_TEST_DATABASE_URL is identical to the app's real "
            f"DATABASE_URL (read from {APP_ENV_PATH}). The load-test suite must use a "
            "dedicated database.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not app_db_url:
        print(
            f"WARNING: could not read {APP_ENV_PATH} to compare against LOAD_TEST_DATABASE_URL "
            "— proceeding on trust. Verify perf/.env.loadtest manually.",
            file=sys.stderr,
        )

    print("[reset_load_test_db] load-test DB confirmed distinct from the app's real database — resetting and reseeding")
    reset_and_reseed(test_db_url)


if __name__ == "__main__":
    main()
