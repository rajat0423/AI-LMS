# /app/models/streak.py
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid
from datetime import date

class Streak(Base):
    __tablename__ = "streaks"
    
    streak_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), unique=True)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(Date, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="streak")
