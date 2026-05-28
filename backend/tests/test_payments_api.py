import pytest
from unittest.mock import patch, MagicMock
import json

def test_create_checkout_session(client, create_user, auth_headers, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.STRIPE_API_KEY", "test_key")
    user, pwd = create_user(role_name="student", email="pay@example.com")
    headers = auth_headers("pay@example.com", pwd)
    
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_123"
    
    with patch("stripe.checkout.Session.create", return_value=mock_session):
        response = client.post(
            "/api/v1/payments/create-checkout-session",
            json={"success_url": "http://localhost/success", "cancel_url": "http://localhost/cancel"},
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["checkout_url"] == "https://checkout.stripe.com/pay/cs_test_123"

def test_webhook_checkout_completed(client, create_user, auth_headers, db_session, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.STRIPE_WEBHOOK_SECRET", "whsec_test")
    user, pwd = create_user(role_name="student", email="webhook@example.com")
    headers = auth_headers("webhook@example.com", pwd)
    
    event_payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(user.user_id),
                "customer": "cus_123",
                "subscription": "sub_123",
                "payment_intent": "pi_123",
                "amount_total": 2900
            }
        }
    }
    
    with patch("stripe.Webhook.construct_event", return_value=event_payload):
        response = client.post(
            "/api/v1/payments/webhook",
            data=json.dumps(event_payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Stripe-Signature": "t=123,v1=abc"}
        )
        assert response.status_code == 200
        
    sub_resp = client.get("/api/v1/payments/my/subscription", headers=headers)
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()
    assert sub_data["plan_type"] == "premium"
    assert sub_data["status"] == "active"
    
    pay_resp = client.get("/api/v1/payments/my/payments", headers=headers)
    assert pay_resp.status_code == 200
    pays = pay_resp.json()
    assert len(pays) == 1
    assert pays[0]["amount"] == 29.0
    assert pays[0]["status"] == "completed"
