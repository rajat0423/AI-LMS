# /app/models/submission.py
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid
import enum

class SubmissionType(str, enum.Enum):
    EMAIL = "email"
    RESUME = "resume"
    INTERVIEW = "interview"
    PERSONALITY = "personality"


class AIFeedbackSource(str, enum.Enum):
    AI = "ai"
    ADMIN = "admin"

class Submission(Base):
    __tablename__ = "submissions"
    
    submission_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    submission_type = Column(Enum(SubmissionType), nullable=False)
    content = Column(Text, nullable=False)
    file_url = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="submissions")
    feedback = relationship("AIFeedback", back_populates="submission", uselist=False)

class AIFeedback(Base):
    __tablename__ = "ai_feedback"
    
    feedback_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.submission_id"), unique=True)
    score = Column(Integer, nullable=True)
    feedback_text = Column(Text, nullable=False)
    improved_version = Column(Text, nullable=True)
    strengths = Column(JSONB, nullable=True)
    weaknesses = Column(JSONB, nullable=True)
    suggestions = Column(JSONB, nullable=True)
    source = Column(String(20), nullable=False, default=AIFeedbackSource.ADMIN.value)
    model_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    submission = relationship("Submission", back_populates="feedback")
