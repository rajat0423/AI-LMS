from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.time import utc_now
from app.database import Base
import uuid


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    analysis_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    resume_filename = Column(String(255), nullable=False)
    resume_file_url = Column(String(500), nullable=False)
    resume_text = Column(Text, nullable=False)
    job_description = Column(Text, nullable=False)
    match_percentage = Column(Integer, nullable=True)
    matched_keywords = Column(JSONB, nullable=True)
    missing_keywords = Column(JSONB, nullable=True)
    analysis_summary = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="completed")
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="resume_analyses")
