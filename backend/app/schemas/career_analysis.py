from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator


ResumeAnalysisStatus = Literal["completed", "failed"]
InterviewSessionStatus = Literal["in_progress", "completed"]


class ResumeAnalysisSummaryResponse(BaseModel):
    analysis_id: uuid.UUID
    user_id: uuid.UUID
    resume_filename: str
    match_percentage: Optional[int]
    status: ResumeAnalysisStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeAnalysisDetailResponse(BaseModel):
    analysis_id: uuid.UUID
    user_id: uuid.UUID
    resume_filename: str
    resume_file_url: str
    job_description: str
    match_percentage: Optional[int]
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    analysis_summary: Optional[str]
    status: ResumeAnalysisStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewSessionCreateRequest(BaseModel):
    role_applied: Optional[str] = Field(default=None, max_length=100)
    job_description: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("role_applied", "job_description")
    @classmethod
    def strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class InterviewSessionCompleteRequest(BaseModel):
    answers: list[str] = Field(min_length=1)

    model_config = ConfigDict(extra="forbid")

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, value: list[str]) -> list[str]:
        cleaned = [" ".join(answer.split()) for answer in value]
        if any(not answer for answer in cleaned):
            raise ValueError("Interview answers cannot be blank")
        return cleaned


class InterviewSessionSummaryResponse(BaseModel):
    session_id: uuid.UUID
    user_id: uuid.UUID
    role_applied: Optional[str]
    total_questions: int
    overall_score: Optional[int]
    status: InterviewSessionStatus
    created_at: datetime
    completed_at: Optional[datetime]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewSessionDetailResponse(BaseModel):
    session_id: uuid.UUID
    user_id: uuid.UUID
    role_applied: Optional[str]
    job_description: Optional[str]
    total_questions: int
    overall_score: Optional[int]
    status: InterviewSessionStatus
    questions: list[str] = Field(default_factory=list)
    answers: list[str] = Field(default_factory=list)
    feedback_summary: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvement_areas: list[str] = Field(default_factory=list)
    better_answer_suggestions: list[str] = Field(default_factory=list)
    created_at: datetime
    completed_at: Optional[datetime]
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
