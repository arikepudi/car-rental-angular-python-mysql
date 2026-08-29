import re

from .faq_data import FAQ_ENTRIES

_STOPWORDS = {
    "a", "an", "the", "is", "are", "do", "does", "did", "i", "my", "me", "to", "for", "of",
    "in", "on", "and", "or", "how", "what", "when", "where", "can", "could", "you", "your",
    "it", "this", "that", "with", "about", "please", "have", "has", "will", "would", "there",
}

_CONFIRMATION_CODE_RE = re.compile(
    r"\b([0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?)\b", re.IGNORECASE
)

_RESERVATION_KEYWORDS = {
    "booking", "bookings", "reservation", "reservations", "reserve", "reserved", "rental",
    "rented", "confirmation", "pickup", "dropoff", "drop", "off", "itinerary", "trip",
}

_CATALOG_KEYWORDS = {
    "categories", "category", "locations", "location", "fleet", "selection", "inventory",
    "offer", "offering", "available",
}


def tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9']+", text.lower())
    return {w for w in words if w not in _STOPWORDS and len(w) > 1}


def extract_confirmation_code(message: str) -> str | None:
    """An 8-hex-char prefix (what's shown to users) or a full UUID, if present."""
    match = _CONFIRMATION_CODE_RE.search(message)
    return match.group(1).lower() if match else None


def is_reservation_intent(message: str) -> bool:
    return bool(tokenize(message) & _RESERVATION_KEYWORDS)


def is_catalog_intent(message: str) -> bool:
    return bool(tokenize(message) & _CATALOG_KEYWORDS)


def match_faq(message: str) -> dict | None:
    """Plain keyword-overlap scoring over the curated FAQ set — no free-text generation,
    so the reply is always one of the pre-written answers or nothing at all."""
    tokens = tokenize(message)
    if not tokens:
        return None
    best_entry = None
    best_score = 0
    for entry in FAQ_ENTRIES:
        score = len(tokens & set(entry["keywords"]))
        if score > best_score:
            best_score = score
            best_entry = entry
    return best_entry if best_score > 0 else None


def _cancellation_status(booking: dict) -> str:
    if not booking["cancellable"]:
        return "no longer cancellable"
    if booking["cancellation_fee"] > 0:
        return f"cancellable now with a ${booking['cancellation_fee']:.2f} late fee"
    return "still free to cancel"


def format_booking_line(booking: dict) -> str:
    return (
        f"{booking['car_name']} (confirmation #{booking['id'][:8]}): "
        f"{booking['starts_at'][:10]} to {booking['ends_at'][:10]}, "
        f"total ${booking['total_price']:.2f} — {_cancellation_status(booking)}."
    )


def format_bookings_reply(bookings: list[dict]) -> str:
    lines = "\n".join(format_booking_line(b) for b in bookings)
    return f"Here's what I have on file for you:\n{lines}"
