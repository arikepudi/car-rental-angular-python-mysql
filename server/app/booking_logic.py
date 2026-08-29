from datetime import datetime
from decimal import Decimal

FREE_CANCELLATION_HOURS = 48
LATE_CANCELLATION_FEE_DAYS = 1  # fee = this many days' rate, inside the free-cancellation window


def compute_total(price_per_day: Decimal, starts_at: datetime, ends_at: datetime) -> Decimal:
    days = max((ends_at.date() - starts_at.date()).days, 1)  # 1-day minimum
    return price_per_day * Decimal(days)


def cancellation_terms(starts_at: datetime, ends_at: datetime, price_per_day: Decimal, total_price: Decimal) -> dict:
    """Always computed fresh against the current time — never stored, never trusted from the client."""
    now = datetime.utcnow()
    if ends_at < now:
        return {"cancellable": False, "fee": Decimal("0")}
    hours_until_start = (starts_at - now).total_seconds() / 3600
    if hours_until_start >= FREE_CANCELLATION_HOURS:
        return {"cancellable": True, "fee": Decimal("0")}
    fee = min(price_per_day * LATE_CANCELLATION_FEE_DAYS, total_price)
    return {"cancellable": True, "fee": fee}


def serialize_booking(row) -> dict:
    """Shared by routes/bookings.py and the chat assistant — one place that turns a raw
    `bookings` row into JSON-safe, cancellation-terms-enriched output."""
    terms = cancellation_terms(row["starts_at"], row["ends_at"], row["price_per_day"], row["total_price"])
    return {
        "id": row["id"],
        "car_id": row["car_id"],
        "car_name": row["car_name"],
        "price_per_day": float(row["price_per_day"]),
        "starts_at": row["starts_at"].isoformat(),
        "ends_at": row["ends_at"].isoformat(),
        "total_price": float(row["total_price"]),
        "customer_name": row["customer_name"],
        "email": row["email"],
        "created_at": row["created_at"].isoformat(),
        "cancellable": terms["cancellable"],
        "cancellation_fee": float(terms["fee"]),
    }
