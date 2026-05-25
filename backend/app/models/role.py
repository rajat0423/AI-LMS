# /app/models/role.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class Role(Base):
    __tablename__ = "roles"
    
    role_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_name = Column(String(50), unique=True, nullable=False)
    permissions = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    users = relationship("User", back_populates="role")
