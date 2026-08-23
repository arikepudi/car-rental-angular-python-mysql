import os

from fastapi import Depends, HTTPException, Request

from .auth import get_session_user
from .db import engine

TRUSTED_ORIGINS = [
    o
    for o in [
        os.environ.get("CLIENT_ORIGIN"),
        os.environ.get("RENDER_EXTERNAL_URL"),
        "http://localhost:4200",
    ]
    if o
]


def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    with engine.begin() as conn:
        return get_session_user(conn, token)  # None if absent/expired — never raises


def require_auth(user=Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in required")
    return user


def verify_origin(request: Request):
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return
    origin = request.headers.get("origin")
    if origin not in TRUSTED_ORIGINS:
        raise HTTPException(status_code=403, detail="Invalid origin")
