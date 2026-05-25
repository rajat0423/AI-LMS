# /app/models/personality.py
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class PersonalityAnalysis(Base):
    __tablename__ = "personality_analysis"
    
    analysis_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.submission_id"), nullable=True)
    personality_type = Column(String(100), nullable=True)
    traits = Column(JSONB, nullable=False)
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    user = relationship("User", back_populates="personality_analyses")
