from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from ..booking_logic import cancellation_terms, compute_total
from ..db import engine
from ..deps import get_current_user, require_auth, verify_origin
from ..schemas import BookingCreate

router = APIRouter()


def _serialize(row) -> dict:
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


@router.post("", dependencies=[Depends(verify_origin)])
def create_booking(payload: BookingCreate, user=Depends(get_current_user)):
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=400, detail="Return date must be after pickup date")

    with engine.begin() as conn:
        # Lock the car's row before checking overlap. Cars are seeded data — the row
        # always exists before any booking is attempted — so this alone serializes
        # concurrent booking attempts on the same car, including its very first booking.
        car = conn.execute(text("SELECT * FROM cars WHERE id = :id FOR UPDATE"), {"id": payload.car_id}).mappings().first()
        if car is None:
            raise HTTPException(status_code=404, detail="Car not found")

        overlap = conn.execute(
            text(
                """SELECT 1 FROM bookings
                   WHERE car_id = :id AND starts_at < :ends_at AND ends_at > :starts_at
                   LIMIT 1"""
            ),
            {"id": payload.car_id, "starts_at": payload.starts_at, "ends_at": payload.ends_at},
        ).first()
        if overlap is not None:
            raise HTTPException(status_code=409, detail="This car is already booked for part of your selected dates")

        # Price is computed server-side from the locked DB row — never from the request body.
        total_price = compute_total(car["price_per_day"], payload.starts_at, payload.ends_at)
        booking_id = str(uuid4())
        conn.execute(
            text(
                """INSERT INTO bookings
                   (id, car_id, car_name, price_per_day, starts_at, ends_at, total_price, customer_name, email, user_id)
                   VALUES (:id, :car_id, :car_name, :price_per_day, :starts_at, :ends_at, :total_price, :customer_name, :email, :user_id)"""
            ),
            {
                "id": booking_id,
                "car_id": car["id"],
                "car_name": car["name"],
                "price_per_day": car["price_per_day"],
                "starts_at": payload.starts_at,
                "ends_at": payload.ends_at,
                "total_price": total_price,
                "customer_name": payload.customer_name,
                "email": payload.email,
                "user_id": user["id"] if user else None,
            },
        )
        row = conn.execute(text("SELECT * FROM bookings WHERE id = :id"), {"id": booking_id}).mappings().first()
        return _serialize(row)


@router.get("/mine")
def my_bookings(user=Depends(require_auth)):
    # Scoped to the caller from the start — an earlier version of this endpoint in a
    # sibling app shipped unscoped and leaked every user's bookings. Never repeat that.
    with engine.begin() as conn:
        rows = conn.execute(
            text("SELECT * FROM bookings WHERE user_id = :user_id ORDER BY created_at DESC"),
            {"user_id": user["id"]},
        ).mappings().all()
    return [_serialize(r) for r in rows]


@router.get("/{booking_id}")
def get_booking(booking_id: str):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT * FROM bookings WHERE id = :id"), {"id": booking_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return _serialize(row)


@router.delete("/{booking_id}", dependencies=[Depends(verify_origin)])
def cancel_booking(booking_id: str, user=Depends(require_auth)):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT * FROM bookings WHERE id = :id"), {"id": booking_id}).mappings().first()
        if row is None:
            raise HTTPException(status_code=404, detail="Booking not found")
        if row["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only cancel your own bookings")
        terms = cancellation_terms(row["starts_at"], row["ends_at"], row["price_per_day"], row["total_price"])
        if not terms["cancellable"]:
            raise HTTPException(status_code=400, detail="This booking has already happened and can't be cancelled")
        conn.execute(text("DELETE FROM bookings WHERE id = :id"), {"id": booking_id})
        return {"cancelled": True, "fee": float(terms["fee"])}
