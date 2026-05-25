# /app/models/user.py
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False, default=3)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.role_id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationships
    role = relationship("Role", back_populates="users")
    submissions = relationship("Submission", back_populates="user")
    progress = relationship("UserProgress", back_populates="user")
    streak = relationship("Streak", back_populates="user", uselist=False)
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    payments = relationship("Payment", back_populates="user")
    interview_sessions = relationship("InterviewSession", back_populates="user")
    resume_analyses = relationship("ResumeAnalysis", back_populates="user")
    personality_analyses = relationship("PersonalityAnalysis", back_populates="user")

    @property
    def role_name(self) -> str | None:
        return self.role.role_name if self.role else None
