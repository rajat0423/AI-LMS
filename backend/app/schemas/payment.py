import uuid
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class SubscriptionResponse(BaseModel):
    subscription_id: uuid.UUID
    plan_type: str
    status: str
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(BaseModel):
    payment_id: uuid.UUID
    amount: float
    currency: str
    status: str
    payment_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
