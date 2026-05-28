import pytest

from app.services import career_analysis_service
from app.services.career_ai_service import (
    CareerAIProviderError,
    CareerInterviewFeedbackResult,
    CareerResumeMatchResult,
)


FAKE_PDF_BYTES = b"%PDF-1.4 career analysis test payload"


def test_student_can_create_and_list_resume_analyses(
    client,
    create_user,
    auth_headers,
    monkeypatch,
    career_upload_dir,
):
    student_user, student_password = create_user(
        role_name="student", is_premium=True,
        email="resume-student@example.com",
    )
    student_headers = auth_headers(student_user.email, student_password)

    monkeypatch.setattr(
        career_analysis_service,
        "_extract_resume_text",
        lambda _file_bytes: "Python SQL FastAPI leadership",
    )
    monkeypatch.setattr(
        career_analysis_service.career_ai_service,
        "generate_resume_match",
        lambda **_kwargs: CareerResumeMatchResult(
            match_percentage=87,
            matched_keywords=["Python", "FastAPI"],
            missing_keywords=["Docker"],
            analysis_summary="Strong backend fit with one delivery gap.",
        ),
    )

    create_response = client.post(
        "/api/v1/my/resume-analyses",
        headers=student_headers,
        data={"job_description": "Need Python, FastAPI, and Docker experience."},
        files={"resume_file": ("resume.pdf", FAKE_PDF_BYTES, "application/pdf")},
    )
    assert create_response.status_code == 201, create_response.text
    payload = create_response.json()
    assert payload["match_percentage"] == 87
    assert payload["matched_keywords"] == ["Python", "FastAPI"]
    assert payload["missing_keywords"] == ["Docker"]
    assert payload["status"] == "completed"
    assert payload["resume_file_url"].endswith(".pdf")

    saved_files = list(career_upload_dir.glob("*.pdf"))
    assert len(saved_files) == 1

    list_response = client.get("/api/v1/my/resume-analyses", headers=student_headers)
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert len(list_payload) == 1
    assert list_payload[0]["match_percentage"] == 87


def test_resume_analysis_rejects_invalid_upload_types(
    client,
    create_user,
    auth_headers,
    career_upload_dir,
):
    student_user, student_password = create_user(
        role_name="student", is_premium=True,
        email="invalid-upload@example.com",
    )
    student_headers = auth_headers(student_user.email, student_password)

    response = client.post(
        "/api/v1/my/resume-analyses",
        headers=student_headers,
        data={"job_description": "Need SQL reporting experience."},
        files={"resume_file": ("resume.txt", b"not a pdf", "text/plain")},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["code"] == "bad_request"
    assert payload["error"]["message"] == "Only PDF resume uploads are supported"


def test_resume_analysis_detail_enforces_ownership(
    client,
    create_user,
    auth_headers,
    monkeypatch,
    career_upload_dir,
):
    owner_user, owner_password = create_user(role_name="student", is_premium=True, email="owner-resume@example.com")
    other_user, other_password = create_user(role_name="student", is_premium=True, email="other-resume@example.com")

    monkeypatch.setattr(
        career_analysis_service,
        "_extract_resume_text",
        lambda _file_bytes: "resume text",
    )
    monkeypatch.setattr(
        career_analysis_service.career_ai_service,
        "generate_resume_match",
        lambda **_kwargs: CareerResumeMatchResult(
            match_percentage=70,
            matched_keywords=["SQL"],
            missing_keywords=["Python"],
            analysis_summary="Decent analytics baseline.",
        ),
    )

    create_response = client.post(
        "/api/v1/my/resume-analyses",
        headers=auth_headers(owner_user.email, owner_password),
        data={"job_description": "Need SQL and Python."},
        files={"resume_file": ("resume.pdf", FAKE_PDF_BYTES, "application/pdf")},
    )
    analysis_id = create_response.json()["analysis_id"]

    forbidden_response = client.get(
        f"/api/v1/my/resume-analyses/{analysis_id}",
        headers=auth_headers(other_user.email, other_password),
    )
    assert forbidden_response.status_code == 403
    assert (
        forbidden_response.json()["error"]["message"]
        == "You do not have access to this resume analysis"
    )


def test_resume_analysis_provider_failures_fall_back_to_heuristic_match_successfully(
    client,
    create_user,
    auth_headers,
    monkeypatch,
    career_upload_dir,
):
    student_user, student_password = create_user(
        role_name="student", is_premium=True,
        email="resume-provider@example.com",
    )
    student_headers = auth_headers(student_user.email, student_password)

    monkeypatch.setattr(
        career_analysis_service,
        "_extract_resume_text",
        lambda _file_bytes: "resume text with university and bachelor degree and experience",
    )
    def mock_raise_provider_error(*args, **kwargs):
        raise CareerAIProviderError("provider down")

    monkeypatch.setattr(
        career_analysis_service.career_ai_service,
        "generate_resume_match",
        mock_raise_provider_error,
    )

    create_response = client.post(
        "/api/v1/my/resume-analyses",
        headers=student_headers,
        data={"job_description": "Need backend engineering experience and Python."},
        files={"resume_file": ("resume.pdf", FAKE_PDF_BYTES, "application/pdf")},
    )

    assert create_response.status_code == 201, create_response.text
    payload = create_response.json()
    assert payload["status"] == "completed"
    assert payload["match_percentage"] > 0

    list_response = client.get("/api/v1/my/resume-analyses", headers=student_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_student_can_create_and_complete_interview_sessions(
    client,
    create_user,
    auth_headers,
    monkeypatch,
):
    student_user, student_password = create_user(
        role_name="student", is_premium=True,
        email="interview-student@example.com",
    )
    student_headers = auth_headers(student_user.email, student_password)

    create_response = client.post(
        "/api/v1/my/interview-sessions",
        headers=student_headers,
        json={
            "role_applied": "software engineer",
            "job_description": "Need debugging and API design experience.",
        },
    )
    assert create_response.status_code == 201
    create_payload = create_response.json()
    assert create_payload["status"] == "in_progress"
    assert len(create_payload["questions"]) == 3
    session_id = create_payload["session_id"]

    monkeypatch.setattr(
        career_analysis_service.career_ai_service,
        "generate_interview_feedback",
        lambda **_kwargs: CareerInterviewFeedbackResult(
            overall_score=89,
            feedback_summary=["Solid structure and technical clarity."],
            strengths=["Clear examples"],
            improvement_areas=["More measurable impact"],
            better_answer_suggestions=["Quantify the debugging outcome."],
        ),
    )

    complete_response = client.post(
        f"/api/v1/my/interview-sessions/{session_id}/complete",
        headers=student_headers,
        json={
            "answers": [
                "I fixed a production bug by tracing the failing query.",
                "I compare logs, inputs, and local configuration.",
                "I prefer clarity first, then optimize after tests pass.",
            ]
        },
    )
    assert complete_response.status_code == 200
    complete_payload = complete_response.json()
    assert complete_payload["status"] == "completed"
    assert complete_payload["overall_score"] == 89
    assert complete_payload["feedback_summary"] == ["Solid structure and technical clarity."]
    assert complete_payload["better_answer_suggestions"] == [
        "Quantify the debugging outcome."
    ]

    list_response = client.get("/api/v1/my/interview-sessions", headers=student_headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["status"] == "completed"


def test_interview_session_detail_and_completion_enforce_ownership(
    client,
    create_user,
    auth_headers,
):
    owner_user, owner_password = create_user(role_name="student", is_premium=True, email="owner-interview@example.com")
    other_user, other_password = create_user(role_name="student", is_premium=True, email="other-interview@example.com")

    create_response = client.post(
        "/api/v1/my/interview-sessions",
        headers=auth_headers(owner_user.email, owner_password),
        json={"role_applied": "general"},
    )
    session_id = create_response.json()["session_id"]

    forbidden_detail = client.get(
        f"/api/v1/my/interview-sessions/{session_id}",
        headers=auth_headers(other_user.email, other_password),
    )
    assert forbidden_detail.status_code == 403
    assert (
        forbidden_detail.json()["error"]["message"]
        == "You do not have access to this interview session"
    )

    forbidden_complete = client.post(
        f"/api/v1/my/interview-sessions/{session_id}/complete",
        headers=auth_headers(other_user.email, other_password),
        json={"answers": ["a", "b", "c"]},
    )
    assert forbidden_complete.status_code == 403
    assert (
        forbidden_complete.json()["error"]["message"]
        == "You do not have access to this interview session"
    )


def test_interview_session_provider_failures_return_upstream_error_and_keep_session_retryable(
    client,
    create_user,
    auth_headers,
    monkeypatch,
):
    student_user, student_password = create_user(
        role_name="student", is_premium=True,
        email="interview-provider@example.com",
    )
    student_headers = auth_headers(student_user.email, student_password)

    create_response = client.post(
        "/api/v1/my/interview-sessions",
        headers=student_headers,
        json={"role_applied": "general"},
    )
    session_id = create_response.json()["session_id"]

    def mock_raise_provider_error(*args, **kwargs):
        raise CareerAIProviderError("provider down")

    monkeypatch.setattr(
        career_analysis_service.career_ai_service,
        "generate_interview_feedback",
        mock_raise_provider_error,
    )

    complete_response = client.post(
        f"/api/v1/my/interview-sessions/{session_id}/complete",
        headers=student_headers,
        json={"answers": ["answer one", "answer two", "answer three"]},
    )
    assert complete_response.status_code == 502
    payload = complete_response.json()
    assert payload["error"]["code"] == "upstream_error"

    detail_response = client.get(
        f"/api/v1/my/interview-sessions/{session_id}",
        headers=student_headers,
    )
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["status"] == "in_progress"
    assert detail_payload["answers"] == []
