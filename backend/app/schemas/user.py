# /app/schemas/user.py
from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.core.academic_years import normalize_year_value


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    year: int = Field(..., ge=1, le=4)

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "email": "student@example.com",
                "password": "securepass123",
                "first_name": "John",
                "last_name": "Doe",
                "year": 3,
            }
        }
    )

    @field_validator("year")
    @classmethod
    def validate_year(cls, value: int) -> int:
        return normalize_year_value(value)


class UserResponse(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    first_name: str
    last_name: str
    year: int
    role_id: Optional[uuid.UUID] = None
    role_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "email": "student@example.com",
                "password": "securepass123",
            }
        }
    )


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None
