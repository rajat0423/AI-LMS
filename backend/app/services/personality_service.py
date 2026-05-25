from sqlalchemy.orm import Session
from app.models.personality import PersonalityAnalysis
from app.schemas.personality import AssessmentCompleteRequest
from app.models.user import User

def complete_assessment(db: Session, user: User, data: AssessmentCompleteRequest) -> PersonalityAnalysis:
    traits = {
        "communication": 65,
        "confidence": 70,
        "professionalReadiness": 60,
        "resumeMatch": 55
    }
    
    analysis = PersonalityAnalysis(
        user_id=user.user_id,
        personality_type="Learner",
        traits=traits,
        recommendations="Keep practicing your communication skills. You have a solid foundation."
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis

def get_latest_assessment(db: Session, user: User) -> PersonalityAnalysis | None:
    return db.query(PersonalityAnalysis).filter(
        PersonalityAnalysis.user_id == user.user_id
    ).order_by(PersonalityAnalysis.created_at.desc()).first()
