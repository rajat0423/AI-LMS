from datetime import datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.submission import AIFeedbackSource, SubmissionType


SubmissionReviewStatus = Literal["pending", "in_review", "reviewed", "needs_revision"]


class SubmissionCreate(BaseModel):
    submission_type: SubmissionType
    content: str = Field(..., min_length=1)
    file_url: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Content cannot be blank")
        return stripped


class SubmissionUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1)
    file_url: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Content cannot be blank")
        return stripped


class SubmissionStatusUpdate(BaseModel):
    status: SubmissionReviewStatus

    model_config = ConfigDict(extra="forbid")


class AIFeedbackUpsert(BaseModel):
    score: Optional[int] = Field(default=None, ge=0, le=100)
    feedback_text: str = Field(..., min_length=1)
    improved_version: Optional[str] = None
    strengths: Optional[list[str]] = None
    weaknesses: Optional[list[str]] = None
    suggestions: Optional[list[str]] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("feedback_text")
    @classmethod
    def validate_feedback_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Feedback text cannot be blank")
        return stripped


class SubmissionUserSummary(BaseModel):
    user_id: uuid.UUID
    email: str
    first_name: str
    last_name: str

    model_config = ConfigDict(from_attributes=True)


class AIFeedbackResponse(BaseModel):
    feedback_id: uuid.UUID
    submission_id: uuid.UUID
    score: Optional[int]
    feedback_text: str
    improved_version: Optional[str]
    strengths: Optional[list[str]]
    weaknesses: Optional[list[str]]
    suggestions: Optional[list[str]]
    source: AIFeedbackSource
    model_name: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionSummaryResponse(BaseModel):
    submission_id: uuid.UUID
    user_id: uuid.UUID
    submission_type: SubmissionType
    status: SubmissionReviewStatus
    content_preview: str
    file_url: Optional[str]
    created_at: datetime
    has_feedback: bool
    user: Optional[SubmissionUserSummary] = None


class SubmissionDetailResponse(BaseModel):
    submission_id: uuid.UUID
    user_id: uuid.UUID
    submission_type: SubmissionType
    content: str
    file_url: Optional[str]
    status: SubmissionReviewStatus
    created_at: datetime
    feedback: Optional[AIFeedbackResponse] = None
    user: Optional[SubmissionUserSummary] = None
