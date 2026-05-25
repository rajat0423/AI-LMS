# /app/api/v1/admin_users.py
"""Admin user management endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.core.permissions import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin/users", tags=["Admin - Users"])


@router.get("/", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/count")
def user_count(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get total user count."""
    total = db.query(User).count()
    active = db.query(User).filter(User.is_active == True).count()
    return {"total": total, "active": active, "inactive": total - active}


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get single user details (admin only)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}/toggle-active")
def toggle_user_active(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Toggle a user's active status (admin only)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = not user.is_active
    db.commit()
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}
