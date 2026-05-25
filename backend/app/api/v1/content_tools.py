# /app/api/v1/content_tools.py
"""
Content Tools routes — Email Generator and Blog Writer.

Secured with require_student so any logged-in user can access these features.
"""
from fastapi import APIRouter, Depends, Query

from app.core.api_docs import error_responses
from app.core.permissions import require_student
from app.models.user import User
from app.schemas.content_tools import (
    BlogAssistRequest,
    BlogAssistResponse,
    BlogPublishRequest,
    BlogPublishResponse,
    EmailAssistRequest,
    EmailAssistResponse,
    EmailGenerateRequest,
    EmailGenerateResponse,
)
from app.services import content_tools_service

router = APIRouter(tags=["Content Tools"])


# ── Email ──────────────────────────────────────────────────────────────────────

@router.post(
    "/email/generate",
    response_model=EmailGenerateResponse,
    responses=error_responses(400, 401, 403, 422, 500, 502),
)
def generate_email(
    request_data: EmailGenerateRequest,
    _current_user: User = Depends(require_student),
) -> EmailGenerateResponse:
    """Generate a professional email draft from a brief description."""
    return content_tools_service.generate_email(
        email_prompt=request_data.email_prompt,
        tone=request_data.tone,
        recipient_name=request_data.recipient_name,
        company_name=request_data.company_name,
        purpose=request_data.purpose,
        subject_hint=request_data.subject_hint,
        sender_name=request_data.sender_name,
        sender_email=request_data.sender_email,
        key_points=request_data.key_points,
        additional_context=request_data.additional_context,
        call_to_action=request_data.call_to_action,
    )


@router.post(
    "/email/assist",
    response_model=EmailAssistResponse,
    responses=error_responses(400, 401, 403, 422, 500, 502),
)
def assist_email(
    request_data: EmailAssistRequest,
    _current_user: User = Depends(require_student),
) -> EmailAssistResponse:
    """Run a targeted AI action (grammar check, rewrite, etc.) on an existing email draft."""
    return content_tools_service.assist_email(
        action=request_data.action,
        subject=request_data.subject,
        body=request_data.body,
        tone=request_data.tone,
        purpose=request_data.purpose,
        instruction=request_data.instruction,
        recipient_name=request_data.recipient_name,
        company_name=request_data.company_name,
        sender_name=request_data.sender_name,
    )


# ── Blog ───────────────────────────────────────────────────────────────────────

@router.post(
    "/blog/assist",
    response_model=BlogAssistResponse,
    responses=error_responses(400, 401, 403, 422, 500, 502),
)
def assist_blog(
    request_data: BlogAssistRequest,
    _current_user: User = Depends(require_student),
) -> BlogAssistResponse:
    """Run a publish-check (grammar, format, quality score) on a blog draft."""
    return content_tools_service.assist_blog(
        action=request_data.action,
        title=request_data.title,
        content=request_data.content,
        author_name=request_data.author_name,
        author_email=request_data.author_email,
    )


@router.post(
    "/blog/publish",
    response_model=BlogPublishResponse,
    status_code=201,
    responses=error_responses(400, 401, 403, 422, 500),
)
def publish_blog(
    request_data: BlogPublishRequest,
    _current_user: User = Depends(require_student),
) -> BlogPublishResponse:
    """Publish a pre-checked blog draft privately."""
    return content_tools_service.publish_blog(request_data)


@router.get(
    "/blog/published",
    response_model=dict,
    responses=error_responses(401, 403, 500),
)
def list_published_blogs(
    author_email: str = Query(...),
    _current_user: User = Depends(require_student),
) -> dict:
    """List privately published blogs for the authenticated user."""
    blogs = content_tools_service.list_published_blogs(author_email=author_email)
    return {"blogs": blogs}
