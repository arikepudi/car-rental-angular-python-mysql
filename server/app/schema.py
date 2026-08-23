from sqlalchemy import text

from .db import engine

# CREATE TABLE IF NOT EXISTS, run on every boot — idempotent, no separate migration step.
# Order matters: cars before bookings (FK), users before sessions (FK).
_DDL = [
    """
    CREATE TABLE IF NOT EXISTS cars (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      location VARCHAR(255) NOT NULL,
      price_per_day DECIMAL(10, 2) NOT NULL,
      rating DECIMAL(2, 1) NOT NULL DEFAULT 0,
      image LONGTEXT NOT NULL,
      tags JSON NOT NULL,
      metadata JSON NOT NULL
    ) ENGINE=InnoDB
    """,
    """
    CREATE TABLE IF NOT EXISTS bookings (
      id CHAR(36) PRIMARY KEY,
      car_id INT NOT NULL,
      car_name VARCHAR(255) NOT NULL,
      price_per_day DECIMAL(10, 2) NOT NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id CHAR(36) NULL,
      CONSTRAINT fk_bookings_car FOREIGN KEY (car_id) REFERENCES cars(id),
      INDEX idx_bookings_car_id (car_id),
      INDEX idx_bookings_user_id (user_id)
    ) ENGINE=InnoDB
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
    """,
    """
    CREATE TABLE IF NOT EXISTS sessions (
      id CHAR(64) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_sessions_user_id (user_id)
    ) ENGINE=InnoDB
    """,
]


def ensure_schema():
    with engine.begin() as conn:
        for statement in _DDL:
            conn.execute(text(statement))
