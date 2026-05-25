from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime, timezone

def generate_uuid():
    return str(uuid.uuid4())

class Certificate(Base):
    __tablename__ = "certificates"
    certificate_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=False)
    issued_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    credential_url = Column(String) # Optionally store a link or IPFS hash
    
    user = relationship("User")
    module = relationship("Module")
