from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict


class ProgressItemResponse(BaseModel):
    progress_id: uuid.UUID
    lesson_id: uuid.UUID
    lesson_title: str
    module_id: uuid.UUID
    module_title: str
    is_completed: bool
    completed_at: Optional[datetime]
    score: Optional[int]
    updated_at: datetime


class ProgressOverviewResponse(BaseModel):
    total_items: int
    completed_items: int
    items: list[ProgressItemResponse]


class LearningStatsResponse(BaseModel):
    total_modules: int
    completed_modules: int
    total_lessons: int
    completed_lessons: int
    completion_percentage: float
    current_streak: int
    longest_streak: int
    resume_score: int
    avg_accuracy: int
    confidence_score: int
    has_taken_interview: bool
    has_drafted_email: bool
    career_xp: int

    model_config = ConfigDict(from_attributes=True)


class LessonCompletionResponse(BaseModel):
    message: str
    progress: ProgressItemResponse
