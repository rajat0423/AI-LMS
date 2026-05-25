# /app/models/payment.py
from sqlalchemy import Column, String, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.time import utc_now
from app.database import Base
import uuid

class Payment(Base):
    __tablename__ = "payments"
    
    payment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.subscription_id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    stripe_payment_intent_id = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False)
    payment_date = Column(DateTime(timezone=True), default=utc_now)
    
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")
