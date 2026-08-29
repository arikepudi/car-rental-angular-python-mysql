from .booking_logic import FREE_CANCELLATION_HOURS, LATE_CANCELLATION_FEE_DAYS

# Curated FAQ set — every answer describes only what this app actually does. Numbers that
# come from real constants (cancellation window/fee) are interpolated here rather than
# duplicated as literals, so the FAQ text can't drift out of sync with booking_logic.py.
#
# `keywords` drive matching in chat_assistant.py — they're deliberately broader than the
# words in `question`/`answer` (synonyms, misspellings-adjacent short forms) since the
# matcher is plain keyword overlap, not a language model.
FAQ_ENTRIES = [
    {
        "id": "what-is-this",
        "question": "What is RoadReady Rentals?",
        "answer": (
            "RoadReady Rentals is a car rental booking app. You can browse available cars, "
            "compare a few side by side, and reserve one for a date range — no account required "
            "to book, though signing in lets you see and manage your reservations later."
        ),
        "keywords": ["what", "roadready", "rentals", "app", "site", "service", "about"],
    },
    {
        "id": "browse-filter",
        "question": "How do I search or filter cars?",
        "answer": (
            "On the Browse page you can filter by pickup/return date, category (Economy, SUV, "
            "Luxury, Electric, etc.), and sort by top rated or price. Cars already booked for "
            "your chosen dates are automatically excluded from the results."
        ),
        "keywords": ["search", "filter", "browse", "find", "sort", "category", "categories"],
    },
    {
        "id": "compare",
        "question": "How does comparing cars work?",
        "answer": (
            "Add up to 3 cars to your comparison list from the browse page or a car's detail "
            "page, then open the Compare page for a side-by-side table of price, rating, and "
            "every listed feature and spec — useful for deciding between similar cars before you book."
        ),
        "keywords": ["compare", "comparison", "side", "side-by-side", "versus", "vs"],
    },
    {
        "id": "guest-checkout",
        "question": "Do I need an account to book a car?",
        "answer": (
            "No — guest checkout is allowed, you just provide a name and email at checkout. "
            "Creating an account isn't required to book, but it does let you see your booking "
            "history and cancel bookings later from My Bookings."
        ),
        "keywords": ["account", "signup", "sign", "up", "register", "guest", "login"],
    },
    {
        "id": "pricing",
        "question": "How is the total price calculated?",
        "answer": (
            "Total price is the car's daily rate multiplied by the number of rental days, with "
            "a 1-day minimum. The price shown while you're choosing dates is an estimate — the "
            "server recalculates the authoritative total from the car's real rate when you confirm."
        ),
        "keywords": ["price", "pricing", "cost", "total", "rate", "charge", "charged", "how", "much"],
    },
    {
        "id": "cancellation",
        "question": "What is the cancellation policy?",
        "answer": (
            f"Cancellation is free if you cancel at least {FREE_CANCELLATION_HOURS} hours before "
            f"pickup. Inside that window, a late fee equal to {LATE_CANCELLATION_FEE_DAYS} day's "
            "rate applies (capped at your booking's total price). Once the rental period has "
            "started, it can no longer be cancelled."
        ),
        "keywords": ["cancel", "cancellation", "refund", "fee", "policy", "change", "reschedule"],
    },
    {
        "id": "guest-cancellation-limit",
        "question": "Can I cancel a booking I made as a guest?",
        "answer": (
            "Not through the site directly — cancelling requires signing in to the account that "
            "owns the booking, and guest bookings aren't linked to any account. If you booked as "
            "a guest and need to cancel, please contact human support."
        ),
        "keywords": ["guest", "cancel", "cancellation", "cannot", "unable"],
    },
    {
        "id": "payment",
        "question": "Does this app process payments online?",
        "answer": (
            "No — confirming a booking reserves the car and records your name, email, and the "
            "agreed price; this app does not collect card details or charge any payment online."
        ),
        "keywords": ["payment", "pay", "card", "credit", "charge", "checkout", "secure", "security"],
    },
    {
        "id": "session",
        "question": "How long does my sign-in last, and is it secure?",
        "answer": (
            "Signed-in sessions last up to 30 days and refresh automatically while you're active, "
            "so you won't be logged out mid-use. Your session is a secure, HttpOnly cookie — it "
            "can't be read by page scripts — and signing out immediately invalidates it everywhere."
        ),
        "keywords": ["session", "signed", "sign", "login", "logged", "secure", "security", "cookie", "expire", "long", "last"],
    },
    {
        "id": "confirmation-number",
        "question": "Where do I find my confirmation number?",
        "answer": (
            "It's shown on the booking confirmation page right after checkout, labeled "
            "\"Confirmation #\" — it's the first 8 characters of your booking's ID. You can give "
            "that to me to look up a specific reservation."
        ),
        "keywords": ["confirmation", "number", "code", "reference", "id"],
    },
]

FALLBACK_MESSAGE = (
    "I don't have information about that. I can help with browsing or comparing cars, how "
    "pricing and cancellation work, and looking up your own reservations — for anything else, "
    "please reach out to our human support team."
)
