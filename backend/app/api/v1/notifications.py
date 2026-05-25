# /app/api/v1/notifications.py
"""Notification endpoints — list, mark-read, mark-all-read."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

from app.core.security import get_current_user_from_token
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    notification_id: uuid.UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Get all notifications for the current user, newest first."""
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )

    # If no notifications exist yet, seed some welcome notifications
    if not notifs:
        welcome_notifs = [
            Notification(
                user_id=current_user.user_id,
                title="Welcome to AI LMS! 🎉",
                message="Start your learning journey with our AI-powered tools.",
                notification_type="success",
                link="/ai-tools",
            ),
            Notification(
                user_id=current_user.user_id,
                title="Try the AI Interviewer",
                message="Practice mock interviews and get instant AI feedback.",
                notification_type="info",
                link="/interview",
            ),
            Notification(
                user_id=current_user.user_id,
                title="Upload your Resume",
                message="Get your ATS score and keyword analysis in seconds.",
                notification_type="info",
                link="/resume",
            ),
        ]
        db.add_all(welcome_notifs)
        db.commit()
        notifs = (
            db.query(Notification)
            .filter(Notification.user_id == current_user.user_id)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all()
        )

    return notifs


@router.get("/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Get the count of unread notifications."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.user_id,
            Notification.is_read == False,
        )
        .count()
    )
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id,
            Notification.user_id == current_user.user_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.patch("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.user_id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
