import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .routes import auth_routes, bookings, cars, chat
from .schema import ensure_schema

DIST_DIR = Path(__file__).resolve().parent.parent.parent / "client" / "dist" / "client" / "browser"
IS_PRODUCTION = os.environ.get("ENVIRONMENT") == "production"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in [os.environ.get("CLIENT_ORIGIN"), "http://localhost:4200"] if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api/auth")
app.include_router(cars.router, prefix="/api/cars")
app.include_router(bookings.router, prefix="/api/bookings")
app.include_router(chat.router, prefix="/api/chat")

if IS_PRODUCTION:
    # Angular's default build doesn't emit a browser/assets/ subfolder (only images/fonts
    # placed under public/ with a matching glob would), so this fallback route both serves
    # any real static file that exists (JS/CSS/favicon) and falls back to index.html for
    # client-side routes — no separate StaticFiles mount needed.
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # Registered after the routers above, so /api/* always matches first.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")


@app.on_event("startup")
async def start():
    ensure_schema()
