from fastapi import APIRouter, Depends, Request, Header, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user_from_token
from app.models.user import User
from app.models.subscription import Subscription
from app.models.payment import Payment
from app.schemas.payment import SubscriptionResponse, PaymentResponse
from app.services import payment_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/payments", tags=["payments"])

class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str

@router.post("/create-checkout-session")
def create_checkout_session(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    try:
        url = payment_service.create_checkout_session(
            user=current_user,
            success_url=req.success_url,
            cancel_url=req.cancel_url
        )
        return {"checkout_url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    payload = await request.body()
    try:
        payment_service.handle_webhook(payload, stripe_signature, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "success"}

@router.get("/my/subscription", response_model=Optional[SubscriptionResponse])
def get_my_subscription(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.user_id).first()
    return sub

@router.get("/my/payments", response_model=list[PaymentResponse])
def list_my_payments(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.user_id
    ).order_by(Payment.payment_date.desc()).all()
    return payments
