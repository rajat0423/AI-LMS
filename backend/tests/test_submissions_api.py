import pytest

from app.services.ai_feedback_service import AIProviderError, GeneratedFeedback
from app.services import submission_service


@pytest.mark.parametrize(
    "submission_type",
    ["email", "resume", "interview", "personality"],
)
def test_student_can_generate_ai_feedback_for_all_submission_types(
    client,
    create_user,
    auth_headers,
    monkeypatch,
    submission_type,
):
    student_user, student_password = create_user(role_name="student", email=f"{submission_type}@example.com")
    student_headers = auth_headers(student_user.email, student_password)

    monkeypatch.setattr(
        submission_service.ai_feedback_service,
        "generate_feedback",
        lambda _submission: GeneratedFeedback(
            score=91,
            feedback_text=f"AI feedback for {submission_type}.",
            improved_version=f"Improved {submission_type} version.",
            strengths=["Clear structure"],
            weaknesses=["Needs more specificity"],
            suggestions=["Add measurable outcomes"],
        ),
    )

    create_response = client.post(
        "/api/v1/submissions",
        headers=student_headers,
        json={
            "submission_type": submission_type,
            "content": f"Draft content for {submission_type}.",
        },
    )
    assert create_response.status_code == 201
    submission_id = create_response.json()["submission_id"]

    generate_response = client.post(
        f"/api/v1/my/submissions/{submission_id}/generate-feedback",
        headers=student_headers,
    )
    assert generate_response.status_code == 200
    payload = generate_response.json()
    assert payload["status"] == "in_review"
    assert payload["feedback"]["source"] == "ai"
    assert payload["feedback"]["model_name"]
    assert payload["feedback"]["feedback_text"] == f"AI feedback for {submission_type}."
    assert payload["feedback"]["score"] == 91

    locked_update_response = client.put(
        f"/api/v1/my/submissions/{submission_id}",
        headers=student_headers,
        json={"content": "Trying to edit after AI feedback."},
    )
    assert locked_update_response.status_code == 400
    assert locked_update_response.json()["error"]["message"] == "Only pending submissions can be updated"

    second_generate_response = client.post(
        f"/api/v1/my/submissions/{submission_id}/generate-feedback",
        headers=student_headers,
    )
    assert second_generate_response.status_code == 400
    assert second_generate_response.json()["error"]["message"] == "Only pending submissions can generate AI feedback"


def test_ai_feedback_generation_failures_keep_submission_pending(
    client,
    create_user,
    auth_headers,
    monkeypatch,
):
    student_user, student_password = create_user(role_name="student", email="student@example.com")
    student_headers = auth_headers(student_user.email, student_password)

    monkeypatch.setattr(
        submission_service.ai_feedback_service,
        "generate_feedback",
        lambda _submission: (_ for _ in ()).throw(AIProviderError("provider down")),
    )

    create_response = client.post(
        "/api/v1/submissions",
        headers=student_headers,
        json={"submission_type": "email", "content": "Draft email content."},
    )
    submission_id = create_response.json()["submission_id"]

    generate_response = client.post(
        f"/api/v1/my/submissions/{submission_id}/generate-feedback",
        headers=student_headers,
    )
    assert generate_response.status_code == 502
    payload = generate_response.json()
    assert payload["error"]["code"] == "upstream_error"
    assert "AI feedback service is unavailable" in payload["error"]["message"]

    get_response = client.get(
        f"/api/v1/my/submissions/{submission_id}",
        headers=student_headers,
    )
    assert get_response.status_code == 200
    submission_payload = get_response.json()
    assert submission_payload["status"] == "pending"
    assert submission_payload["feedback"] is None


def test_ai_feedback_generation_respects_submission_ownership(
    client,
    create_user,
    auth_headers,
    monkeypatch,
):
    owner_user, owner_password = create_user(role_name="student", email="owner@example.com")
    other_user, other_password = create_user(role_name="student", email="other@example.com")

    monkeypatch.setattr(
        submission_service.ai_feedback_service,
        "generate_feedback",
        lambda _submission: GeneratedFeedback(
            score=75,
            feedback_text="Ownership should prevent this path.",
            improved_version=None,
            strengths=["N/A"],
            weaknesses=["N/A"],
            suggestions=["N/A"],
        ),
    )

    create_response = client.post(
        "/api/v1/submissions",
        headers=auth_headers(owner_user.email, owner_password),
        json={"submission_type": "email", "content": "Owner draft"},
    )
    submission_id = create_response.json()["submission_id"]

    forbidden_response = client.post(
        f"/api/v1/my/submissions/{submission_id}/generate-feedback",
        headers=auth_headers(other_user.email, other_password),
    )
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["error"]["message"] == "You do not have access to this submission"


def test_submission_flow_supports_student_and_admin_actions(client, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(role_name="student", email="student@example.com")

    admin_headers = auth_headers(admin_user.email, admin_password)
    student_headers = auth_headers(student_user.email, student_password)

    create_response = client.post(
        "/api/v1/submissions",
        headers=student_headers,
        json={
            "submission_type": "email",
            "content": "  Draft follow-up email to a recruiter.  ",
        },
    )
    assert create_response.status_code == 201
    submission_payload = create_response.json()
    assert submission_payload["submission_type"] == "email"
    assert submission_payload["status"] == "pending"
    assert submission_payload["content"] == "Draft follow-up email to a recruiter."

    update_response = client.put(
        f"/api/v1/my/submissions/{submission_payload['submission_id']}",
        headers=student_headers,
        json={"content": "Updated recruiter follow-up email."},
    )
    assert update_response.status_code == 200
    assert update_response.json()["content"] == "Updated recruiter follow-up email."

    admin_list_response = client.get("/api/v1/admin/submissions", headers=admin_headers)
    assert admin_list_response.status_code == 200
    admin_list_payload = admin_list_response.json()
    assert admin_list_payload[0]["user"]["email"] == "student@example.com"

    feedback_response = client.put(
        f"/api/v1/admin/submissions/{submission_payload['submission_id']}/feedback",
        headers=admin_headers,
        json={
            "score": 88,
            "feedback_text": "Strong tone with room for sharper closing.",
            "improved_version": "Improved version of the recruiter email.",
            "strengths": ["Professional tone"],
            "weaknesses": ["Closing could be more specific"],
            "suggestions": ["Add a stronger call to action"],
        },
    )
    assert feedback_response.status_code == 200
    feedback_payload = feedback_response.json()
    assert feedback_payload["status"] == "reviewed"
    assert feedback_payload["feedback"]["score"] == 88
    assert feedback_payload["feedback"]["source"] == "admin"
    assert feedback_payload["feedback"]["model_name"] is None

    locked_update_response = client.put(
        f"/api/v1/my/submissions/{submission_payload['submission_id']}",
        headers=student_headers,
        json={"content": "Trying to edit after review."},
    )
    assert locked_update_response.status_code == 400


def test_admin_can_override_ai_generated_feedback_and_republish(
    client,
    create_user,
    auth_headers,
    monkeypatch,
):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(role_name="student", email="student@example.com")

    monkeypatch.setattr(
        submission_service.ai_feedback_service,
        "generate_feedback",
        lambda _submission: GeneratedFeedback(
            score=84,
            feedback_text="Initial AI feedback.",
            improved_version="Initial improved version.",
            strengths=["Professional tone"],
            weaknesses=["Needs more detail"],
            suggestions=["Add a stronger close"],
        ),
    )

    student_headers = auth_headers(student_user.email, student_password)
    admin_headers = auth_headers(admin_user.email, admin_password)

    create_response = client.post(
        "/api/v1/submissions",
        headers=student_headers,
        json={"submission_type": "email", "content": "Draft follow-up email."},
    )
    submission_id = create_response.json()["submission_id"]

    generate_response = client.post(
        f"/api/v1/my/submissions/{submission_id}/generate-feedback",
        headers=student_headers,
    )
    assert generate_response.status_code == 200
    assert generate_response.json()["status"] == "in_review"
    assert generate_response.json()["feedback"]["source"] == "ai"

    override_response = client.put(
        f"/api/v1/admin/submissions/{submission_id}/feedback",
        headers=admin_headers,
        json={
            "score": 90,
            "feedback_text": "Admin-approved feedback.",
            "improved_version": "Admin improved version.",
            "strengths": ["Clear ask"],
            "weaknesses": ["Needs stronger metrics"],
            "suggestions": ["Mention a measurable result"],
        },
    )
    assert override_response.status_code == 200
    payload = override_response.json()
    assert payload["status"] == "reviewed"
    assert payload["feedback"]["source"] == "admin"
    assert payload["feedback"]["model_name"] is None
    assert payload["feedback"]["feedback_text"] == "Admin-approved feedback."


def test_submission_contract_rejects_unknown_fields(client, create_user, auth_headers):
    student_user, student_password = create_user(role_name="student", email="student@example.com")

    response = client.post(
        "/api/v1/submissions",
        headers=auth_headers(student_user.email, student_password),
        json={
            "submission_type": "email",
            "content": "New draft",
            "unexpected": "value",
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "validation_error"
    assert any(item["field"] == "body.unexpected" for item in payload["error"]["details"])


def test_submission_access_errors_use_standard_contract(client, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    owner_user, owner_password = create_user(role_name="student", email="owner@example.com")
    other_user, other_password = create_user(role_name="student", email="other@example.com")

    submission = client.post(
        "/api/v1/submissions",
        headers=auth_headers(owner_user.email, owner_password),
        json={"submission_type": "email", "content": "Owner draft"},
    )
    submission_id = submission.json()["submission_id"]

    forbidden_response = client.get(
        f"/api/v1/my/submissions/{submission_id}",
        headers=auth_headers(other_user.email, other_password),
    )
    assert forbidden_response.status_code == 403
    forbidden_payload = forbidden_response.json()
    assert forbidden_payload["error"]["code"] == "forbidden"
    assert forbidden_payload["error"]["message"] == "You do not have access to this submission"

    not_found_response = client.get(
        "/api/v1/admin/submissions/00000000-0000-0000-0000-000000000001",
        headers=auth_headers(admin_user.email, admin_password),
    )
    assert not_found_response.status_code == 404
    not_found_payload = not_found_response.json()
    assert not_found_payload["error"]["code"] == "not_found"
    assert not_found_payload["error"]["message"] == "Submission not found"
