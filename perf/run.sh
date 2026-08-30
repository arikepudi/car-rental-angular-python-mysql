#!/usr/bin/env bash
# Orchestrates a full load-test run: safety check + reset → start the backend on a dedicated
# port pointed at the load-test DB → run k6 → stop the backend → propagate k6's exit code (the
# actual pre-merge gate — a failed threshold must fail this script, not be swallowed).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
REPO_ROOT="$(cd .. && pwd)"

set -a
source .env.loadtest
set +a

SCENARIO="${1:-k6/scenarios/growth-ramp.js}"

echo "== Step 1/4: safety check + reset the load-test database =="
"$REPO_ROOT/server/.venv/bin/python3" scripts/reset_load_test_db.py

echo "== Step 2/4: starting the backend on :$LOAD_TEST_BACKEND_PORT (pointed at the load-test DB) =="
# Fail loudly if the port is already occupied — a stale process left over from a previous
# interrupted run (or anything else) would otherwise make the readiness check below pass
# against the WRONG process, silently load-testing outdated code instead of what's on disk
# now. This was a real bug caught while validating this exact script.
if lsof -ti ":$LOAD_TEST_BACKEND_PORT" >/dev/null 2>&1; then
  echo "ERROR: port $LOAD_TEST_BACKEND_PORT is already in use (PID $(lsof -ti ":$LOAD_TEST_BACKEND_PORT"))." >&2
  echo "Free it first (kill that process) — refusing to risk testing against a stale instance." >&2
  exit 1
fi

(
  cd "$REPO_ROOT/server"
  source .venv/bin/activate
  DATABASE_URL="$LOAD_TEST_DATABASE_URL" \
  ENVIRONMENT=development \
  CLIENT_ORIGIN="$K6_BASE_URL" \
  SESSION_SECRET=load-test-secret \
  uvicorn app.main:app --port "$LOAD_TEST_BACKEND_PORT" \
    > "$REPO_ROOT/perf/reports/backend.log" 2>&1 &
  echo $! > "$REPO_ROOT/perf/.backend.pid"
)

cleanup() {
  if [ -f "$REPO_ROOT/perf/.backend.pid" ]; then
    kill "$(cat "$REPO_ROOT/perf/.backend.pid")" 2>/dev/null || true
    rm -f "$REPO_ROOT/perf/.backend.pid"
  fi
}
trap cleanup EXIT

echo -n "waiting for the backend to come up"
for _ in $(seq 1 30); do
  if ! kill -0 "$(cat "$REPO_ROOT/perf/.backend.pid")" 2>/dev/null; then
    echo
    echo "ERROR: the backend process died during startup — see perf/reports/backend.log" >&2
    exit 1
  fi
  if curl -s -o /dev/null "$K6_BASE_URL/api/cars"; then
    # Confirm the PID we started is actually the one bound to the port, not merely that
    # *a* process (potentially a leftover one from elsewhere) is responding — belt-and-braces
    # on top of the preflight check above.
    bound_pid="$(lsof -ti ":$LOAD_TEST_BACKEND_PORT" 2>/dev/null | head -1)"
    expected_pid="$(cat "$REPO_ROOT/perf/.backend.pid")"
    if [ "$bound_pid" != "$expected_pid" ]; then
      echo
      echo "ERROR: something other than the process this script started (PID $expected_pid) is bound to :$LOAD_TEST_BACKEND_PORT (PID $bound_pid instead). Aborting rather than testing against it." >&2
      exit 1
    fi
    echo " — up (PID $expected_pid confirmed bound to :$LOAD_TEST_BACKEND_PORT)"
    break
  fi
  echo -n "."
  sleep 1
done

echo "== Step 3/4: running k6 against $SCENARIO =="
mkdir -p reports
set +e
k6 run --env K6_BASE_URL="$K6_BASE_URL" "$SCENARIO"
K6_EXIT_CODE=$?
set -e

echo "== Step 4/4: done — reports written to perf/reports/ =="
exit $K6_EXIT_CODE
