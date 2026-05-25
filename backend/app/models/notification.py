# /app/models/notification.py
import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info")  # info, success, warning, alert
    is_read = Column(Boolean, default=False)
    link = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", backref="notifications")
