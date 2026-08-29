# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Two independent projects, `client/` (Angular) and `server/` (FastAPI) — run both together for local dev:

```bash
# server — from server/, with the venv active
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt   # first time only
uvicorn app.main:app --reload --port 8000      # dev API on :8000
python -m app.seed                             # idempotent: seeds `cars` only if the table is empty

# client — from client/
npm install        # first time only
ng serve --proxy-config proxy.conf.json    # dev server on :4200, proxies /api/* to :8000 (see proxy.conf.json)
ng build            # production build; output lands in dist/client/browser/ (note the /browser suffix)
ng test              # Vitest — currently only the default Angular CLI stub spec, and it's stale (asserts
                      # on "Hello, client" text that no longer exists since app.html was replaced)
```

There is no linter configured in either project (no ESLint config in `client/`, no ruff/pytest in `server/`).

**E2E regression suite (`e2e/`)** — a separate Node project (its own `package.json`), Playwright Test, run on demand before merging:

```bash
cd e2e
npm install && npx playwright install chromium   # first time only
npx playwright test          # runs headed (a real Chromium window opens) — see below, this is deliberate
npx playwright show-report    # inspect trace/screenshot/video for the most recent run's failures
```

Needs `e2e/.env.test` (gitignored; `.env.test.example` has the placeholder) with `TEST_DATABASE_URL` — **a database that is not `server/.env`'s real `car_rental` database.** `e2e/global-setup.ts` refuses to run at all if the two URLs match, then truncates every table in the test database and reseeds it via `python -m app.seed` before every run. The suite starts its own frontend/backend instances on dedicated ports (`:4300`/`:8100` by default, see `e2e/playwright.config.ts`) so it never touches whatever dev servers are already running on `:4200`/`:8000`. `headless: false` is a deliberate, standing configuration choice, not a default left unconfigured — don't change it without the user asking. `e2e/` is never copied into the Docker image (see `Dockerfile`'s `COPY` lines) — it has no effect on what gets deployed.

Full local + Docker + Render verification loop (what to run before believing a change works):

```bash
cd client && ng build                                       # must succeed; check dist/client/browser/index.html exists
cd server && python -m app.seed
uvicorn app.main:app --reload --port 8000 &
cd ../client && ng serve --proxy-config proxy.conf.json &
curl -s http://localhost:8000/api/cars | python3 -m json.tool
```

To reproduce the production container locally before deploying:

```bash
docker build -t car-rental-app .
docker run -d -p 8002:8000 -e DATABASE_URL=... -e SESSION_SECRET=... -e ENVIRONMENT=production car-rental-app
```

## Environment

`server/.env` (gitignored; `server/.env.example` has the placeholders) needs:

- `DATABASE_URL` — a MySQL-compatible connection string in SQLAlchemy form: `mysql+pymysql://user:password@host:port/database`. This app currently points at a TiDB Cloud Serverless cluster, not a local MySQL.
- `SESSION_SECRET` — currently unused by the cookie-session auth itself (sessions are opaque random tokens, not signed), but reserved for future crypto needs; still required to be set.
- `ENVIRONMENT` — `development` locally; set to `production` only in the deployed container (gates `Secure` cookie flag and enables the SPA static-file/catch-all route in `main.py`).
- `CLIENT_ORIGIN` — the frontend's origin, used both for CORS and for the CSRF Origin-header allowlist (`app/deps.py`'s `TRUSTED_ORIGINS`). In production on Render this isn't needed because `RENDER_EXTERNAL_URL` is auto-injected and already included in that allowlist.

TLS is mandatory for the TiDB connection. `app/db.py` passes `certifi`'s CA bundle explicitly via `connect_args={"ssl": {"ca": certifi.where()}}` rather than relying on the OS trust store — this matters because macOS's python.org builds don't wire the system trust store into the `ssl` module by default, and relying on it would silently work on Linux (Docker) but fail locally with `SSLCertVerificationError`.

## Architecture

**Single-artifact in production, two processes in dev.** `server/app/main.py` mounts the API routers under `/api/*`, and when `ENVIRONMENT=production` also serves the built Angular files from `client/dist/client/browser/` with a catch-all route that falls back to `index.html` for client-side routes (checking `full_path.startswith("api/")` first so an unknown API path 404s instead of returning the SPA shell). In dev, Angular's dev server (`ng serve`) and FastAPI run as separate processes on :4200/:8000, connected by `client/proxy.conf.json` so the frontend only ever calls relative `/api/...` paths — this also means dev and prod both see `/api` as same-origin, so session cookies flow without any CORS-credentials wrangling in either mode.

**Deployment is one Docker image.** The root `Dockerfile` is a two-stage build: a `node:22-slim` stage runs `ng build` (Angular CLI 22 requires Node ≥22.22.3 — a `node:20` stage fails outright), and a `python:3.12-slim` stage installs `server/requirements.txt` and copies the built Angular output from the first stage. The container's `CMD` runs the seed script (a no-op once `cars` has rows) then starts `uvicorn` bound to `$PORT`. Deployed on Render as a Docker-runtime web service — Render has no managed MySQL, so the database is external (currently TiDB Cloud Serverless).

**Backend (`server/app/`)**
- `db.py` — the shared SQLAlchemy `Engine` (`pool_pre_ping=True`, `pool_recycle=1800` — without these, a connection the DB host silently closed after its idle timeout surfaces as an intermittent `2006: MySQL server has gone away` on the next request that reuses it, not on connect). No ORM models are used anywhere in this codebase — every query is raw SQL via `text()` against `engine.begin()` transaction contexts.
- `schema.py` — `ensure_schema()`, `CREATE TABLE IF NOT EXISTS` for `cars`, `bookings`, `users`, `sessions`, run on every startup (`main.py`'s `@app.on_event("startup")`). No migration framework.
- `auth.py` / `deps.py` — custom cookie-session auth, not a third-party auth library. Sessions are opaque random tokens (`secrets.token_urlsafe`); only a SHA-256 hash of the token is stored in the `sessions` table, so a leaked DB row can't be replayed as a valid cookie. Sessions use sliding expiry (`SESSION_REFRESH_THRESHOLD` in `auth.py`) — an active session's `expires_at` gets pushed back out on use, an idle one just expires. `get_current_user` (in `deps.py`) resolves to `None` rather than raising, so routes that must allow guests (booking creation) can read it directly; `require_auth` raises 401. Password hashing uses the `bcrypt` package directly, deliberately not `passlib` (its bcrypt backend breaks under `bcrypt>=4.0`). `verify_origin` in `deps.py` is a dependency applied to state-changing routes that checks the `Origin` header against `TRUSTED_ORIGINS` as CSRF defense-in-depth — a raw `curl` without an `Origin` header will 403 there, which is expected.
- `routes/cars.py`, `routes/bookings.py`, `routes/auth_routes.py`, `routes/chat.py` — one router module per resource, each mounted with its own `/api/...` prefix in `main.py`. `GET /api/bookings/mine` requires auth and filters by `user_id` — keep it that way if it's ever refactored; an earlier sibling app of this same lineage shipped that endpoint unscoped by accident.
- `booking_logic.py` — `compute_total()`, `cancellation_terms()`, and `serialize_booking()` (a `bookings` row → JSON-safe dict with cancellation terms attached). All three are meant to be called from route handlers, never duplicated client-side or re-implemented elsewhere: pricing and cancellation eligibility/fee are always computed server-side, fresh, from the DB row. `serialize_booking()` is shared by `routes/bookings.py` and `routes/chat.py` — don't reintroduce a second copy of it.
- **The booking-creation race fix** (`routes/bookings.py`, `create_booking`): the target car's row is locked with `SELECT ... FOR UPDATE` *before* checking for an overlapping booking, inside the same transaction as the insert. This works because `cars` rows are always seeded ahead of time — the row to lock already exists even for a car's very first booking, which is what makes the plain row lock sufficient here (no separate named/advisory lock needed).
- MySQL-specific data handling to know about: `DECIMAL` columns come back from PyMySQL as Python `Decimal`, not `float` — mixing `Decimal` with a plain `float` in arithmetic raises `TypeError`, so price math casts explicitly (see `booking_logic.py`). `JSON` columns (`cars.tags`, `cars.metadata`) come back as raw strings, not parsed — every read does `json.loads()` and every write does `json.dumps()` explicitly (see `routes/cars.py`'s `_serialize` and `seed.py`).
- `mock_media.py` / `seed_data.py` — car images are generated flat SVGs (base64 data URIs), not fetched from a stock-photo API, so they're guaranteed to actually depict a car.
- **`faq_data.py` / `chat_assistant.py` / `routes/chat.py`** — the FAQ + reservation chat widget (`POST /api/chat`), deliberately **not** LLM-backed — no Anthropic (or any) API key is used anywhere in this app. `chat_assistant.py` is pure functions (tokenize, keyword-overlap FAQ matching, intent detection, response formatting — no DB access, mirroring `booking_logic.py`'s purity); `routes/chat.py` owns the DB queries and decides, in priority order, whether a message is (1) a confirmation-number lookup (regex-matched, looked up via the same public-by-unguessable-id pattern as `GET /api/bookings/{id}`), (2) a reservation question for the signed-in user (`get_current_user`, optional — guests get asked to sign in or supply a confirmation number instead of a 401), (3) a live catalog question (categories/locations queried fresh from `cars`, never hardcoded), or (4) an FAQ keyword match, falling back to an honest "I don't have information about that" otherwise. Every reply is either a literal string from `faq_data.FAQ_ENTRIES` or a real DB row run through a fixed template — there is no free-text generation anywhere in this path, which is what makes "can't hallucinate" true by construction rather than by prompting. If this is ever swapped for an LLM-backed version, re-derive the grounding guarantee from scratch rather than assuming the prompt alone will preserve it. `chat_assistant.py`'s keyword lists are plain tokens, not phrases — the tokenizer splits on non-alphanumerics (so `"sign-up"` and `"drop-off"` never match as single keywords; use `"sign"`/`"up"` and `"drop"`/`"off"` instead), a mismatch that caused two real matching failures the first time this was built.

**Frontend (`client/src/app/`)**, Angular 22, standalone components + signals throughout (no NgModules, no `standalone: true` needed):
- `core/api.service.ts` — the only place that calls `HttpClient`; every other file goes through it.
- `core/session.service.ts` — single source of truth for auth state (`user()`, `ready()` signals). Its session check is kicked off eagerly from its constructor (not from a component's `ngOnInit`) and exposed as `whenReady: Promise<void>` — components that must not act on `user()` before that initial check resolves (`checkout`, `my-bookings`, deciding whether to prefill a form or show a sign-in prompt) `await session.whenReady` first. This exists to avoid a real race: without it, a direct page load/refresh briefly reads `user()` as `null` even for a signed-in user.
- `core/compare.service.ts` — the car-comparison list (max 3), persisted to `localStorage`, deliberately not tied to the signed-in user — same reasoning as a shopping cart, it's a browsing convenience.
- `core/booking-draft.service.ts` — in-memory (not persisted) hand-off of the selected car + dates from `pages/car-detail` to `pages/checkout`. If it's empty, checkout redirects back to browse rather than guessing.
- `pages/` — `home` (browse/filter/sort), `car-detail` (car info + date selection), `compare` (side-by-side spec table, built dynamically from whatever `tags`/`metadata` keys are actually present across the selected cars — not a hardcoded column list), `checkout` (confirms details, submits the booking; the displayed total is an estimate only — the server recomputes the authoritative price), `booking-confirmation`, `my-bookings`, `login`/`signup`.
- `shared/chat-widget/` — the FAQ/reservation chat widget's UI, mounted once in `app.html` (not per-page) so its conversation persists across navigation. Purely a thin caller of `ApiService.chat()`; all matching/grounding logic lives server-side (see the backend section above) — the frontend never decides what counts as a valid answer, it just displays `source`/`topic` from the response as a transparency caption on each bot message. Its toggle button and message input both carry explicit `aria-label`s (added alongside the e2e suite) — the toggle previously had only an emoji as its accessible name, a real accessibility gap, not just a test convenience.
- The home page's car card (`pages/home/home.html`) carries `data-testid="car-card"`, added for the e2e suite (`e2e/pages/home.page.ts`) — one of the few places in this app where a `data-testid` was actually needed over a role/label selector, since it's a repeated grid item. Don't remove it without updating the e2e suite.
- Routing is plain `provideRouter` (`app.routes.ts`), no route guards — pages that need a session check read `session.user()`/`session.whenReady` themselves (see `my-bookings.ts`).

## Origin

Scaffolded via the `build-fullstack-angular-python-app` Claude Code skill (`~/.claude/skills/build-fullstack-angular-python-app/`), which encodes the reasoning behind most of the architecture choices above (why raw SQL over an ORM, why custom session auth over a library, the MySQL-specific gotchas, the Docker deploy approach). Consult that skill's reference docs before making structural changes that might contradict its guidance — e.g. reintroducing an ORM, switching to JWT-based auth, or changing the single-artifact production topology.

The `e2e/` suite was built via the `e2e-test-suite-ui-playwright` Claude Code skill (`~/.claude/skills/e2e-test-suite-ui-playwright/`) — read its reference docs before adding new specs (the Page Object Model + selector conventions in particular) or touching `global-setup.ts`/`playwright.config.ts` (the test-database-isolation and headed-mode rules are non-negotiable, not defaults to reconsider).
