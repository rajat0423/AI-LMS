from sqlalchemy.orm import Session
from app.models.personality import PersonalityAnalysis
from app.schemas.personality import AssessmentCompleteRequest
from app.models.user import User

def complete_assessment(db: Session, user: User, data: AssessmentCompleteRequest) -> PersonalityAnalysis:
    anxiety_num = 5
    has_tailored = False
    
    if data.answers and len(data.answers) >= 2:
        try:
            anxiety_num = int(data.answers[0])
        except ValueError:
            anxiety_num = 5
        has_tailored = data.answers[1] == "Yes"
        
    communication = max(15, min(100, 100 - (anxiety_num * 8)))
    confidence = max(15, min(100, 100 - (anxiety_num * 6) + (10 if has_tailored else -10)))
    professional_readiness = 85 if has_tailored else 45
    resume_match = 80 if has_tailored else 35
    
    traits = {
        "communication": int(communication),
        "confidence": int(confidence),
        "professionalReadiness": int(professional_readiness),
        "resumeMatch": int(resume_match)
    }
    
    if communication >= 70:
        personality_type = "Expressive Communicator"
    elif professional_readiness >= 70:
        personality_type = "Analytical Professional"
    else:
        personality_type = "Growth-Oriented Learner"
        
    recommendations_list = []
    if communication < 70:
        recommendations_list.append("Participate in mock speaking exercises to build public speaking flow and clarity.")
    else:
        recommendations_list.append("Leverage your high baseline communication flow to lead technical mock presentations.")
        
    if not has_tailored:
        recommendations_list.append("Utilize the new ATS Score Calculator to tailor your first resume draft to specific Job Descriptions.")
    else:
        recommendations_list.append("Optimize missing keywords in your resume drafts to aim for the elite 85% ATS threshold.")
        
    analysis = PersonalityAnalysis(
        user_id=user.user_id,
        personality_type=personality_type,
        traits=traits,
        recommendations=" ".join(recommendations_list)
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis

def get_latest_assessment(db: Session, user: User) -> PersonalityAnalysis | None:
    return db.query(PersonalityAnalysis).filter(
        PersonalityAnalysis.user_id == user.user_id
    ).order_by(PersonalityAnalysis.created_at.desc()).first()
