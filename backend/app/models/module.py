# /app/models/module.py
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class Module(Base):
    __tablename__ = "modules"
    
    module_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    year = Column(Integer, nullable=False, default=1)
    order = Column(Integer, nullable=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationships
    lessons = relationship(
        "Lesson",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Lesson.order",
    )
    quizzes = relationship(
        "Quiz",
        back_populates="module",
        cascade="all, delete-orphan",
    )

    @property
    def lesson_count(self) -> int:
        return len(self.lessons or [])

class Lesson(Base):
    __tablename__ = "lessons"
    
    lesson_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.module_id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    module = relationship("Module", back_populates="lessons")
    progress = relationship("UserProgress", back_populates="lesson", cascade="all, delete-orphan")

    @property
    def module_title(self) -> str | None:
        return self.module.title if self.module else None
