from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.academic_years import normalize_year_value


class LessonBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    order: int = Field(..., ge=1)

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "content")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class LessonCreate(LessonBase):
    module_id: uuid.UUID


class LessonUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    content: Optional[str] = Field(default=None, min_length=1)
    order: Optional[int] = Field(default=None, ge=1)

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "content")
    @classmethod
    def validate_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped


class LessonResponse(BaseModel):
    lesson_id: uuid.UUID
    module_id: uuid.UUID
    title: str
    content: str
    order: int
    created_at: datetime
    module_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ModuleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    year: int = Field(default=1, ge=1, le=4)
    order: int = Field(..., ge=1)
    is_premium: bool = False

    model_config = ConfigDict(extra="forbid")

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Title cannot be blank")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @field_validator("year")
    @classmethod
    def validate_year(cls, value: int) -> int:
        return normalize_year_value(value, default=1)


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    year: Optional[int] = Field(default=None, ge=1, le=4)
    order: Optional[int] = Field(default=None, ge=1)
    is_premium: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("title")
    @classmethod
    def validate_optional_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Title cannot be blank")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_optional_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @field_validator("year")
    @classmethod
    def validate_optional_year(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        return normalize_year_value(value, default=1)


class ModuleSummaryResponse(BaseModel):
    module_id: uuid.UUID
    title: str
    description: Optional[str]
    year: int
    order: int
    is_premium: bool
    created_at: datetime
    updated_at: datetime
    lesson_count: int

    model_config = ConfigDict(from_attributes=True)


class ModuleDetailResponse(ModuleSummaryResponse):
    lessons: list[LessonResponse] = Field(default_factory=list)
