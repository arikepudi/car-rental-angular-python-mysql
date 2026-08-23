from datetime import datetime

from pydantic import BaseModel, EmailStr


class BookingCreate(BaseModel):
    car_id: int
    starts_at: datetime
    ends_at: datetime
    customer_name: str
    email: EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str
