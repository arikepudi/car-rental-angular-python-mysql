import hashlib
import os
import secrets
from datetime import datetime, timedelta

import bcrypt
from fastapi import Response
from sqlalchemy import text

SESSION_TTL = timedelta(days=30)
SESSION_REFRESH_THRESHOLD = timedelta(days=7)  # sliding expiry: refresh if less than this remains

IS_PRODUCTION = os.environ.get("ENVIRONMENT") == "production"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _new_session_token() -> str:
    return secrets.token_urlsafe(32)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(conn, user_id: str) -> str:
    token = _new_session_token()
    conn.execute(
        text("INSERT INTO sessions (id, user_id, expires_at) VALUES (:id, :user_id, :expires_at)"),
        {"id": _hash_token(token), "user_id": user_id, "expires_at": datetime.utcnow() + SESSION_TTL},
    )
    return token


def get_session_user(conn, token: str | None):
    if not token:
        return None
    token_hash = _hash_token(token)
    row = conn.execute(
        text(
            """SELECT u.id, u.email, u.name FROM sessions s
               JOIN users u ON u.id = s.user_id
               WHERE s.id = :id AND s.expires_at > :now"""
        ),
        {"id": token_hash, "now": datetime.utcnow()},
    ).mappings().first()
    if row is None:
        return None

    expires_at = conn.execute(
        text("SELECT expires_at FROM sessions WHERE id = :id"), {"id": token_hash}
    ).scalar()
    if expires_at - datetime.utcnow() < SESSION_REFRESH_THRESHOLD:
        conn.execute(
            text("UPDATE sessions SET expires_at = :e WHERE id = :id"),
            {"e": datetime.utcnow() + SESSION_TTL, "id": token_hash},
        )
    return row


def revoke_session(conn, token: str):
    conn.execute(text("DELETE FROM sessions WHERE id = :id"), {"id": _hash_token(token)})


def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        "session_token",
        token,
        httponly=True,
        secure=IS_PRODUCTION,  # a Secure cookie is dropped by browsers over plain http://localhost
        samesite="lax",
        max_age=int(SESSION_TTL.total_seconds()),
        path="/",
    )


def clear_session_cookie(response: Response):
    response.delete_cookie("session_token", path="/")
