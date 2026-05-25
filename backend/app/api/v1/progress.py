from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.api_docs import error_responses
from app.core.permissions import require_student
from app.database import get_db
from app.models.user import User
from app.schemas.progress import LearningStatsResponse, ProgressOverviewResponse
from app.services import progress_service


router = APIRouter(tags=["Progress"])


@router.get("/my/progress", response_model=ProgressOverviewResponse, responses=error_responses(401, 403, 500))
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Get detailed progress entries for the current student."""
    items = progress_service.get_user_progress(db, current_user)
    completed_items = sum(1 for item in items if item.is_completed)
    return ProgressOverviewResponse(
        total_items=len(items),
        completed_items=completed_items,
        items=items,
    )


@router.get("/my/stats", response_model=LearningStatsResponse, responses=error_responses(401, 403, 500))
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Get learning statistics for the current student."""
    return progress_service.get_learning_stats(db, current_user)
