import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.api_docs import error_responses
from app.core.permissions import require_admin, require_student
from app.database import get_db
from app.models.submission import SubmissionType
from app.models.user import User
from app.schemas.submission import (
    AIFeedbackUpsert,
    SubmissionCreate,
    SubmissionDetailResponse,
    SubmissionStatusUpdate,
    SubmissionSummaryResponse,
    SubmissionUpdate,
)
from app.services import submission_service


router = APIRouter(tags=["Submissions"])


@router.post(
    "/submissions",
    response_model=SubmissionDetailResponse,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 422, 500),
)
def create_submission(
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Create a new submission for the current student."""
    return submission_service.create_submission(db, current_user, submission_data)


@router.get(
    "/my/submissions",
    response_model=list[SubmissionSummaryResponse],
    responses=error_responses(401, 403, 500),
)
def list_my_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """List submissions created by the current student."""
    return submission_service.list_user_submissions(db, current_user)


@router.get(
    "/my/submissions/{submission_id}",
    response_model=SubmissionDetailResponse,
    responses=error_responses(401, 403, 404, 500),
)
def get_my_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Get a single submission created by the current student."""
    return submission_service.get_user_submission(db, current_user, submission_id)


@router.put(
    "/my/submissions/{submission_id}",
    response_model=SubmissionDetailResponse,
    responses=error_responses(400, 401, 403, 404, 422, 500),
)
def update_my_submission(
    submission_id: uuid.UUID,
    submission_data: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Update a pending submission owned by the current student."""
    return submission_service.update_user_submission(
        db,
        current_user,
        submission_id,
        submission_data,
    )


@router.post(
    "/my/submissions/{submission_id}/generate-feedback",
    response_model=SubmissionDetailResponse,
    responses=error_responses(400, 401, 403, 404, 500, 502),
)
async def generate_my_submission_feedback(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Generate AI feedback for a pending submission owned by the current student."""
    return await submission_service.generate_feedback_for_user_submission(
        db,
        current_user,
        submission_id,
    )


@router.get(
    "/admin/submissions",
    response_model=list[SubmissionSummaryResponse],
    responses=error_responses(401, 403, 422, 500),
)
def list_admin_submissions(
    submission_type: Optional[SubmissionType] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all submissions for admin review."""
    return submission_service.list_all_submissions(
        db,
        submission_type=submission_type,
        status_filter=status_filter,
    )


@router.get(
    "/admin/submissions/{submission_id}",
    response_model=SubmissionDetailResponse,
    responses=error_responses(401, 403, 404, 500),
)
def get_admin_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get a full submission record for admin review."""
    return submission_service.get_admin_submission(db, submission_id)


@router.patch(
    "/admin/submissions/{submission_id}/status",
    response_model=SubmissionDetailResponse,
    responses=error_responses(401, 403, 404, 422, 500),
)
def update_admin_submission_status(
    submission_id: uuid.UUID,
    status_data: SubmissionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update the workflow status of a submission."""
    return submission_service.update_submission_status(db, submission_id, status_data)


@router.put(
    "/admin/submissions/{submission_id}/feedback",
    response_model=SubmissionDetailResponse,
    responses=error_responses(401, 403, 404, 422, 500),
)
def upsert_admin_feedback(
    submission_id: uuid.UUID,
    feedback_data: AIFeedbackUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create or update AI feedback for a submission."""
    return submission_service.upsert_feedback(db, submission_id, feedback_data)
