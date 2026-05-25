import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Dict, Optional, Any

class AssessmentCompleteRequest(BaseModel):
    answers: list[str]

class PersonalityAnalysisResponse(BaseModel):
    analysis_id: uuid.UUID
    user_id: uuid.UUID
    traits: dict[str, Any]
    personality_type: Optional[str] = None
    recommendations: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
