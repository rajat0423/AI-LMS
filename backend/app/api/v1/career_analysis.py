import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.api_docs import error_responses
from app.core.permissions import require_student, require_premium
from app.database import get_db
from app.models.user import User
from app.schemas.career_analysis import (
    InterviewSessionCompleteRequest,
    InterviewSessionCreateRequest,
    InterviewSessionDetailResponse,
    InterviewSessionSummaryResponse,
    ResumeAnalysisDetailResponse,
    ResumeAnalysisSummaryResponse,
)
from app.services import career_analysis_service


router = APIRouter(tags=["Career Analysis"])


@router.post(
    "/my/resume-analyses",
    response_model=ResumeAnalysisDetailResponse,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(400, 401, 403, 422, 500, 502),
)
async def create_resume_analysis(
    resume_file: UploadFile = File(...),
    job_description: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    return await career_analysis_service.create_resume_analysis(
        db,
        current_user,
        resume_file=resume_file,
        job_description=job_description,
    )


@router.get(
    "/my/resume-analyses",
    response_model=list[ResumeAnalysisSummaryResponse],
    responses=error_responses(401, 403, 500),
)
def list_my_resume_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    return career_analysis_service.list_resume_analyses(db, current_user)


@router.get(
    "/my/resume-analyses/{analysis_id}",
    response_model=ResumeAnalysisDetailResponse,
    responses=error_responses(401, 403, 404, 500),
)
def get_my_resume_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    return career_analysis_service.get_resume_analysis(db, current_user, analysis_id)


@router.post(
    "/my/interview-sessions",
    response_model=InterviewSessionDetailResponse,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(400, 401, 403, 422, 500),
)
def create_interview_session(
    request_data: InterviewSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_premium),
):
    return career_analysis_service.create_interview_session(
        db,
        current_user,
        request_data,
    )


@router.post(
    "/my/interview-sessions/{session_id}/complete",
    response_model=InterviewSessionDetailResponse,
    responses=error_responses(400, 401, 403, 404, 422, 500, 502),
)
async def complete_my_interview_session(
    session_id: uuid.UUID,
    request_data: InterviewSessionCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    return await career_analysis_service.complete_interview_session(
        db,
        current_user,
        session_id,
        request_data,
    )


@router.get(
    "/my/interview-sessions",
    response_model=list[InterviewSessionSummaryResponse],
    responses=error_responses(401, 403, 500),
)
def list_my_interview_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    return career_analysis_service.list_interview_sessions(db, current_user)


@router.get(
    "/my/interview-sessions/{session_id}",
    response_model=InterviewSessionDetailResponse,
    responses=error_responses(401, 403, 404, 500),
)
def get_my_interview_session(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    return career_analysis_service.get_interview_session(db, current_user, session_id)
