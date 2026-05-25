# /app/api/v1/profile.py
"""Profile management endpoints — update profile, change password, forgot/reset password."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from typing import Optional

from app.core.academic_years import normalize_year_value
from app.core.security import get_current_user_from_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Profile"])


class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    year: Optional[int] = Field(None, ge=1, le=4)

    model_config = ConfigDict(extra="forbid")

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_optional_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("year")
    @classmethod
    def validate_optional_year(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        return normalize_year_value(value)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str = Field(..., min_length=6)


# ── Profile Update ───────────────────────────────────────────────────────────

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Update the current user's profile details."""
    if data.first_name is not None:
        current_user.first_name = data.first_name
    if data.last_name is not None:
        current_user.last_name = data.last_name
    if data.year is not None:
        current_user.year = data.year
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Change Password ──────────────────────────────────────────────────────────

@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Change the current user's password (requires old password)."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Forgot Password (stub — sends mock code) ────────────────────────────────

_reset_codes: dict[str, str] = {}  # email -> code  (in-memory for demo)

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password-reset code. In production this sends an email."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Still return success to prevent email enumeration
        return {"message": "If that email exists, a reset code has been sent."}

    import secrets
    code = secrets.token_hex(3).upper()  # e.g. "A1B2C3"
    _reset_codes[data.email] = code

    # In production: send email with code. For demo, log it.
    import logging
    logging.info("PASSWORD RESET CODE for %s: %s", data.email, code)

    return {"message": "If that email exists, a reset code has been sent."}


# ── Reset Password ───────────────────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using the code from forgot-password."""
    expected = _reset_codes.get(data.email)
    if not expected or expected != data.reset_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code",
        )

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(data.new_password)
    db.commit()
    del _reset_codes[data.email]

    return {"message": "Password has been reset successfully. You can now log in."}
