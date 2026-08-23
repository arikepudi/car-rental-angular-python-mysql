from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import text

from ..auth import (
    clear_session_cookie,
    create_session,
    hash_password,
    revoke_session,
    set_session_cookie,
    verify_password,
)
from ..db import engine
from ..deps import get_current_user, require_auth, verify_origin
from ..schemas import SignInRequest, SignupRequest

router = APIRouter()


@router.post("/signup", dependencies=[Depends(verify_origin)])
def signup(payload: SignupRequest, response: Response):
    with engine.begin() as conn:
        existing = conn.execute(text("SELECT 1 FROM users WHERE email = :email"), {"email": payload.email}).first()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
        user_id = str(uuid4())
        conn.execute(
            text("INSERT INTO users (id, email, password_hash, name) VALUES (:id, :email, :ph, :name)"),
            {"id": user_id, "email": payload.email, "ph": hash_password(payload.password), "name": payload.name},
        )
        token = create_session(conn, user_id)
    set_session_cookie(response, token)
    return {"id": user_id, "email": payload.email, "name": payload.name}


@router.post("/sign-in", dependencies=[Depends(verify_origin)])
def sign_in(payload: SignInRequest, response: Response):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": payload.email}).mappings().first()
        if row is None or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_session(conn, row["id"])
    set_session_cookie(response, token)
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


@router.post("/sign-out", dependencies=[Depends(verify_origin), Depends(require_auth)])
def sign_out(request: Request, response: Response):
    token = request.cookies.get("session_token")
    with engine.begin() as conn:
        # Deletes the server-side session row — a copied/stolen cookie stops working the
        # instant the real user signs out, unlike a stateless JWT.
        revoke_session(conn, token)
    clear_session_cookie(response)
    return {"signed_out": True}


@router.get("/session")
def session(user=Depends(get_current_user)):
    if user is None:
        return {"user": None}
    return {"user": {"id": user["id"], "email": user["email"], "name": user["name"]}}
