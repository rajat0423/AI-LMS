import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.api_docs import error_responses
from app.core.permissions import require_admin, require_either, require_student
from app.database import get_db
from app.models.user import User
from app.schemas.module import (
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    ModuleCreate,
    ModuleDetailResponse,
    ModuleSummaryResponse,
    ModuleUpdate,
)
from app.schemas.progress import LessonCompletionResponse
from app.services import module_service, progress_service


router = APIRouter(tags=["LMS"])


@router.get(
    "/modules",
    response_model=list[ModuleSummaryResponse],
    responses=error_responses(401, 403, 500),
)
def list_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_either),
):
    """List all learning modules."""
    return module_service.list_modules(db, user=current_user)


@router.get(
    "/modules/{module_id}",
    response_model=ModuleDetailResponse,
    responses=error_responses(401, 403, 404, 500),
)
def get_module(
    module_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_either),
):
    """Get a single module and its lessons."""
    return module_service.get_module_or_404(db, module_id, user=current_user)


@router.post(
    "/modules",
    response_model=ModuleDetailResponse,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 422, 500),
)
def create_module(
    module_data: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a module (admin only)."""
    return module_service.create_module(db, module_data)


@router.put(
    "/modules/{module_id}",
    response_model=ModuleDetailResponse,
    responses=error_responses(401, 403, 404, 422, 500),
)
def update_module(
    module_id: uuid.UUID,
    module_data: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a module (admin only)."""
    return module_service.update_module(db, module_id, module_data)


@router.delete(
    "/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(401, 403, 404, 500),
)
def delete_module(
    module_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a module and its lessons (admin only)."""
    module_service.delete_module(db, module_id)


@router.get(
    "/modules/{module_id}/lessons",
    response_model=list[LessonResponse],
    responses=error_responses(401, 403, 404, 500),
)
def list_module_lessons(
    module_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_either),
):
    """List lessons for a module."""
    return module_service.list_lessons_for_module(db, module_id, user=current_user)


@router.get(
    "/lessons/{lesson_id}",
    response_model=LessonResponse,
    responses=error_responses(401, 403, 404, 500),
)
def get_lesson(
    lesson_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_either),
):
    """Get lesson details."""
    return module_service.get_lesson_or_404(db, lesson_id, user=current_user)


@router.post(
    "/lessons",
    response_model=LessonResponse,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 404, 422, 500),
)
def create_lesson(
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a lesson (admin only)."""
    return module_service.create_lesson(db, lesson_data)


@router.put(
    "/lessons/{lesson_id}",
    response_model=LessonResponse,
    responses=error_responses(401, 403, 404, 422, 500),
)
def update_lesson(
    lesson_id: uuid.UUID,
    lesson_data: LessonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a lesson (admin only)."""
    return module_service.update_lesson(db, lesson_id, lesson_data)


@router.delete(
    "/lessons/{lesson_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(401, 403, 404, 500),
)
def delete_lesson(
    lesson_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a lesson/topic (admin only)."""
    module_service.delete_lesson(db, lesson_id)


@router.post(
    "/lessons/{lesson_id}/complete",
    response_model=LessonCompletionResponse,
    responses=error_responses(401, 403, 404, 500),
)
def mark_lesson_complete(
    lesson_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Mark a lesson as complete for the current student."""
    module_service.get_lesson_or_404(db, lesson_id, user=current_user)
    progress = progress_service.mark_lesson_complete(db, current_user, lesson_id)
    return LessonCompletionResponse(message="Lesson marked as complete", progress=progress)
