import json

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from ..db import engine

router = APIRouter()


def _serialize(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "location": row["location"],
        "price_per_day": float(row["price_per_day"]),
        "rating": float(row["rating"]),
        "image": row["image"],
        "tags": json.loads(row["tags"]),
        "metadata": json.loads(row["metadata"]),
    }


@router.get("")
def list_cars(
    category: str | None = None,
    location: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    starts_at: str | None = None,
    ends_at: str | None = None,
):
    query = "SELECT * FROM cars WHERE 1 = 1"
    params: dict = {}
    if category:
        query += " AND category = :category"
        params["category"] = category
    if location:
        query += " AND location = :location"
        params["location"] = location
    if min_price is not None:
        query += " AND price_per_day >= :min_price"
        params["min_price"] = min_price
    if max_price is not None:
        query += " AND price_per_day <= :max_price"
        params["max_price"] = max_price
    if starts_at and ends_at:
        # Availability filter: exclude cars with an overlapping booking for the requested
        # window. Read-only here (no lock needed) — the write path in bookings.py is what
        # actually enforces this under concurrency.
        query += """ AND id NOT IN (
            SELECT car_id FROM bookings WHERE starts_at < :ends_at AND ends_at > :starts_at
        )"""
        params["starts_at"] = starts_at
        params["ends_at"] = ends_at
    query += " ORDER BY id"

    with engine.begin() as conn:
        rows = conn.execute(text(query), params).mappings().all()
    return [_serialize(r) for r in rows]


@router.get("/{car_id}")
def get_car(car_id: int):
    with engine.begin() as conn:
        row = conn.execute(text("SELECT * FROM cars WHERE id = :id"), {"id": car_id}).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Car not found")
    return _serialize(row)
