import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.time import utc_now
from app.models.submission import AIFeedback, AIFeedbackSource, Submission
from app.models.user import User
from app.schemas.submission import (
    AIFeedbackResponse,
    AIFeedbackUpsert,
    SubmissionCreate,
    SubmissionDetailResponse,
    SubmissionStatusUpdate,
    SubmissionSummaryResponse,
    SubmissionUpdate,
    SubmissionUserSummary,
)
from app.services.ai_feedback_service import AIProviderError, ai_feedback_service


def _submission_query(db: Session):
    return db.query(Submission).options(
        selectinload(Submission.feedback),
        selectinload(Submission.user),
    )


def _get_submission_or_404(db: Session, submission_id: uuid.UUID) -> Submission:
    submission = (
        _submission_query(db)
        .filter(Submission.submission_id == submission_id)
        .first()
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )
    return submission


def _serialize_feedback(feedback: AIFeedback | None) -> AIFeedbackResponse | None:
    if not feedback:
        return None
    return AIFeedbackResponse.model_validate(feedback)


def _serialize_user(user: User | None) -> SubmissionUserSummary | None:
    if not user:
        return None
    return SubmissionUserSummary.model_validate(user)


def _content_preview(content: str, limit: int = 140) -> str:
    normalized = " ".join(content.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 3].rstrip() + "..."


def _serialize_summary(
    submission: Submission,
    *,
    include_user: bool = False,
) -> SubmissionSummaryResponse:
    return SubmissionSummaryResponse(
        submission_id=submission.submission_id,
        user_id=submission.user_id,
        submission_type=submission.submission_type,
        status=submission.status,
        content_preview=_content_preview(submission.content),
        file_url=submission.file_url,
        created_at=submission.created_at,
        has_feedback=submission.feedback is not None,
        user=_serialize_user(submission.user) if include_user else None,
    )


def _serialize_detail(
    submission: Submission,
    *,
    include_user: bool = False,
) -> SubmissionDetailResponse:
    return SubmissionDetailResponse(
        submission_id=submission.submission_id,
        user_id=submission.user_id,
        submission_type=submission.submission_type,
        content=submission.content,
        file_url=submission.file_url,
        status=submission.status,
        created_at=submission.created_at,
        feedback=_serialize_feedback(submission.feedback),
        user=_serialize_user(submission.user) if include_user else None,
    )


def list_user_submissions(db: Session, user: User) -> list[SubmissionSummaryResponse]:
    submissions = (
        _submission_query(db)
        .filter(Submission.user_id == user.user_id)
        .order_by(Submission.created_at.desc())
        .all()
    )
    return [_serialize_summary(submission) for submission in submissions]


def create_submission(
    db: Session,
    user: User,
    submission_in: SubmissionCreate,
) -> SubmissionDetailResponse:
    submission = Submission(
        user_id=user.user_id,
        submission_type=submission_in.submission_type,
        content=submission_in.content,
        file_url=submission_in.file_url,
        status="pending",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return get_user_submission(db, user, submission.submission_id)


def get_user_submission(
    db: Session,
    user: User,
    submission_id: uuid.UUID,
) -> SubmissionDetailResponse:
    submission = _get_submission_or_404(db, submission_id)
    if submission.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this submission",
        )
    return _serialize_detail(submission)


def update_user_submission(
    db: Session,
    user: User,
    submission_id: uuid.UUID,
    submission_in: SubmissionUpdate,
) -> SubmissionDetailResponse:
    submission = _get_submission_or_404(db, submission_id)
    if submission.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this submission",
        )

    if submission.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending submissions can be updated",
        )

    update_data = submission_in.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update",
        )

    for field, value in update_data.items():
        setattr(submission, field, value)

    db.commit()
    db.refresh(submission)
    return get_user_submission(db, user, submission.submission_id)


async def generate_feedback_for_user_submission(
    db: Session,
    user: User,
    submission_id: uuid.UUID,
) -> SubmissionDetailResponse:
    submission = _get_submission_or_404(db, submission_id)
    if submission.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this submission",
        )

    if submission.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending submissions can generate AI feedback",
        )

    try:
        generated_feedback = await ai_feedback_service.generate_feedback(submission)
    except AIProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI feedback service is unavailable: {exc}",
        ) from exc

    now = utc_now()
    feedback = submission.feedback
    feedback_payload = generated_feedback.model_dump()

    if feedback is None:
        feedback = AIFeedback(
            submission_id=submission.submission_id,
            source=AIFeedbackSource.AI.value,
            model_name=ai_feedback_service.model_name,
            updated_at=now,
            **feedback_payload,
        )
        db.add(feedback)
    else:
        for field, value in feedback_payload.items():
            setattr(feedback, field, value)
        feedback.source = AIFeedbackSource.AI.value
        feedback.model_name = ai_feedback_service.model_name
        feedback.updated_at = now

    submission.status = "in_review"
    db.commit()
    return get_user_submission(db, user, submission.submission_id)


def list_all_submissions(
    db: Session,
    *,
    submission_type: str | None = None,
    status_filter: str | None = None,
) -> list[SubmissionSummaryResponse]:
    query = _submission_query(db)
    if submission_type:
        query = query.filter(Submission.submission_type == submission_type)
    if status_filter:
        query = query.filter(Submission.status == status_filter)

    submissions = query.order_by(Submission.created_at.desc()).all()
    return [
        _serialize_summary(submission, include_user=True)
        for submission in submissions
    ]


def get_admin_submission(db: Session, submission_id: uuid.UUID) -> SubmissionDetailResponse:
    submission = _get_submission_or_404(db, submission_id)
    return _serialize_detail(submission, include_user=True)


def update_submission_status(
    db: Session,
    submission_id: uuid.UUID,
    status_in: SubmissionStatusUpdate,
) -> SubmissionDetailResponse:
    submission = _get_submission_or_404(db, submission_id)
    submission.status = status_in.status
    db.commit()
    db.refresh(submission)
    return get_admin_submission(db, submission.submission_id)


def upsert_feedback(
    db: Session,
    submission_id: uuid.UUID,
    feedback_in: AIFeedbackUpsert,
) -> SubmissionDetailResponse:
    submission = _get_submission_or_404(db, submission_id)
    feedback = submission.feedback

    if feedback is None:
        feedback = AIFeedback(
            submission_id=submission.submission_id,
            source=AIFeedbackSource.ADMIN.value,
            model_name=None,
            updated_at=utc_now(),
            **feedback_in.model_dump(),
        )
        db.add(feedback)
    else:
        for field, value in feedback_in.model_dump().items():
            setattr(feedback, field, value)
        feedback.source = AIFeedbackSource.ADMIN.value
        feedback.model_name = None
        feedback.updated_at = utc_now()

    submission.status = "reviewed"

    db.commit()
    return get_admin_submission(db, submission.submission_id)
