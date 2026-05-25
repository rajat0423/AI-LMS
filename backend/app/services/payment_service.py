import stripe
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.subscription import Subscription
from app.models.payment import Payment
import uuid
import datetime

stripe.api_key = settings.STRIPE_API_KEY

def create_checkout_session(user: User, success_url: str, cancel_url: str):
    if not settings.STRIPE_API_KEY:
        raise ValueError("Stripe API key is not configured")

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': 'Premium AI Features',
                    'description': 'Access to AI-powered resume analysis and interview prep'
                },
                'unit_amount': 2900,  # $29.00
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(user.user_id),
        customer_email=user.email,
    )
    return session.url


def handle_webhook(payload: bytes, sig_header: str, db: Session):
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise ValueError("Stripe webhook secret is not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise e
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise e

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        client_reference_id = session.get('client_reference_id')
        
        if client_reference_id:
            user_id = uuid.UUID(client_reference_id)
            user = db.query(User).filter(User.user_id == user_id).first()
            if user:
                customer_id = session.get('customer')
                subscription_id = session.get('subscription')
                payment_intent_id = session.get('payment_intent')
                amount_total = session.get('amount_total', 0) / 100.0

                subs = db.query(Subscription).filter(Subscription.user_id == user.user_id).first()
                if not subs:
                    subs = Subscription(
                        user_id=user.user_id,
                        plan_type="premium",
                        stripe_customer_id=customer_id,
                        stripe_subscription_id=subscription_id,
                        status="active"
                    )
                    db.add(subs)
                else:
                    subs.plan_type = "premium"
                    subs.stripe_customer_id = customer_id
                    subs.stripe_subscription_id = subscription_id
                    subs.status = "active"
                db.flush()
                
                payment = Payment(
                    user_id=user.user_id,
                    subscription_id=subs.subscription_id,
                    amount=amount_total,
                    currency="USD",
                    stripe_payment_intent_id=payment_intent_id,
                    status="completed"
                )
                db.add(payment)
                db.commit()
