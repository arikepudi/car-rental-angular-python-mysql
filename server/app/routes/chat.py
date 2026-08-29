from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text

from ..booking_logic import serialize_booking
from ..chat_assistant import (
    extract_confirmation_code,
    format_booking_line,
    format_bookings_reply,
    is_catalog_intent,
    is_reservation_intent,
    match_faq,
)
from ..db import engine
from ..deps import get_current_user, verify_origin
from ..faq_data import FALLBACK_MESSAGE

router = APIRouter()

NOT_SIGNED_IN_REPLY = (
    "I can only look up a specific reservation if you're signed in, or if you share your "
    "confirmation number (the 8-character code shown on your booking confirmation page)."
)
NO_BOOKINGS_REPLY = "You don't have any bookings yet — browse our cars to get started!"
CODE_NOT_FOUND_REPLY = (
    "I couldn't find a reservation with that confirmation number. Please double-check it, "
    "or sign in to see your bookings."
)


class ChatRequest(BaseModel):
    message: str


@router.post("", dependencies=[Depends(verify_origin)])
def chat(payload: ChatRequest, user=Depends(get_current_user)):
    message = payload.message.strip()
    if not message:
        return {"reply": "Ask me anything about renting a car, or about your own reservations.", "source": "none"}

    with engine.begin() as conn:
        # Every branch below either returns a curated FAQ string verbatim or formats a real
        # DB row into a fixed template — nothing here is free-text generated, so a reply can
        # never state a fact that isn't actually true.
        code = extract_confirmation_code(message)
        if code:
            row = conn.execute(
                text("SELECT * FROM bookings WHERE id = :code OR id LIKE :prefix LIMIT 1"),
                {"code": code, "prefix": f"{code}%"},
            ).mappings().first()
            if row is None:
                return {"reply": CODE_NOT_FOUND_REPLY, "source": "reservation"}
            return {"reply": format_booking_line(serialize_booking(row)), "source": "reservation"}

        if is_reservation_intent(message):
            if user is None:
                return {"reply": NOT_SIGNED_IN_REPLY, "source": "reservation"}
            rows = conn.execute(
                text("SELECT * FROM bookings WHERE user_id = :uid ORDER BY created_at DESC LIMIT 5"),
                {"uid": user["id"]},
            ).mappings().all()
            if not rows:
                return {"reply": NO_BOOKINGS_REPLY, "source": "reservation"}
            bookings = [serialize_booking(r) for r in rows]
            return {"reply": format_bookings_reply(bookings), "source": "reservation"}

        if is_catalog_intent(message):
            categories = [r[0] for r in conn.execute(text("SELECT DISTINCT category FROM cars ORDER BY category"))]
            locations = [r[0] for r in conn.execute(text("SELECT DISTINCT location FROM cars ORDER BY location"))]
            reply = f"We currently offer these categories: {', '.join(categories)}. Pickup locations: {', '.join(locations)}."
            return {"reply": reply, "source": "catalog"}

    faq_match = match_faq(message)
    if faq_match:
        return {"reply": faq_match["answer"], "source": "faq", "topic": faq_match["question"]}

    return {"reply": FALLBACK_MESSAGE, "source": "none"}
