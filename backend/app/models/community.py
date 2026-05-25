from sqlalchemy import Column, String, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime, timezone

def generate_uuid():
    return str(uuid.uuid4())

class DiscussionThread(Base):
    __tablename__ = "discussion_threads"
    thread_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=True) # Optional link to a course
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    
    user = relationship("User")
    replies = relationship("DiscussionReply", back_populates="thread", cascade="all, delete-orphan")

class DiscussionReply(Base):
    __tablename__ = "discussion_replies"
    reply_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(UUID(as_uuid=True), ForeignKey("discussion_threads.thread_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    
    user = relationship("User")
    thread = relationship("DiscussionThread", back_populates="replies")
