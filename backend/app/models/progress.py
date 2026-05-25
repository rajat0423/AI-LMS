# /app/models/progress.py
from sqlalchemy import Column, Boolean, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    progress_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.lesson_id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    __table_args__ = (UniqueConstraint('user_id', 'lesson_id', name='unique_user_lesson'),)
    
    user = relationship("User", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")
