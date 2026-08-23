import json

from sqlalchemy import text

from .db import engine
from .schema import ensure_schema
from .seed_data import CARS


def seed():
    ensure_schema()
    with engine.begin() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM cars")).scalar()
        if count > 0:
            print(f"cars already has {count} rows, skipping seed")
            return
        for car in CARS:
            conn.execute(
                text(
                    """INSERT INTO cars (name, category, location, price_per_day, rating, image, tags, metadata)
                       VALUES (:name, :category, :location, :price_per_day, :rating, :image, :tags, :metadata)"""
                ),
                {
                    **car,
                    "tags": json.dumps(car["tags"]),
                    "metadata": json.dumps(car["metadata"]),
                },
            )
        print(f"seeded {len(CARS)} cars")


if __name__ == "__main__":
    seed()
