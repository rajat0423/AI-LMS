from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.permissions import require_student
from app.models.user import User
from app.schemas.personality import AssessmentCompleteRequest, PersonalityAnalysisResponse
from app.services import personality_service

router = APIRouter(tags=["Personality Analysis"])

@router.post("/assessment/complete", response_model=PersonalityAnalysisResponse)
def complete_assessment(
    request_data: AssessmentCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    return personality_service.complete_assessment(db, current_user, request_data)

@router.get("/assessment", response_model=PersonalityAnalysisResponse)
def get_assessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    analysis = personality_service.get_latest_assessment(db, current_user)
    if not analysis:
        # return a default one if not taken
        return PersonalityAnalysisResponse(
            analysis_id=current_user.user_id, # mock uuid
            user_id=current_user.user_id,
            traits={"communication": 0, "confidence": 0, "professionalReadiness": 0, "resumeMatch": 0},
            created_at=current_user.created_at
        )
    return analysis
