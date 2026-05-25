# /app/models/interview.py
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    role_applied = Column(String(100), nullable=True)
    job_description = Column(Text, nullable=True)
    total_questions = Column(Integer, nullable=False)
    overall_score = Column(Integer, nullable=True)
    status = Column(String(20), default="in_progress")
    questions = Column(JSONB, nullable=True)
    answers = Column(JSONB, nullable=True)
    feedback_summary = Column(JSONB, nullable=True)
    strengths = Column(JSONB, nullable=True)
    improvement_areas = Column(JSONB, nullable=True)
    better_answer_suggestions = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="interview_sessions")
