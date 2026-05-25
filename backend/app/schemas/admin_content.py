import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AdminOptionInput(BaseModel):
    option_id: Optional[uuid.UUID] = None
    text: str = Field(..., min_length=1, max_length=1000)
    is_correct: bool = False

    model_config = ConfigDict(extra="forbid")

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Option text cannot be blank")
        return stripped


class AdminQuestionBase(BaseModel):
    text: str = Field(..., min_length=1)
    order: int = Field(default=1, ge=1)
    difficulty_level: str = Field(default="Medium", min_length=1, max_length=50)
    placement_relevance: str = Field(
        default="Core placement readiness",
        min_length=1,
        max_length=255,
    )
    explanation: Optional[str] = None
    options: list[AdminOptionInput] = Field(..., min_length=2, max_length=6)

    model_config = ConfigDict(extra="forbid")

    @field_validator("text", "difficulty_level", "placement_relevance")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Field cannot be blank")
        return stripped

    @field_validator("explanation")
    @classmethod
    def normalize_explanation(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None

    @model_validator(mode="after")
    def validate_correct_option(self):
        correct_count = sum(1 for option in self.options if option.is_correct)
        if correct_count != 1:
            raise ValueError("Exactly one option must be marked correct")
        return self


class AdminQuestionCreate(AdminQuestionBase):
    pass


class AdminQuestionUpdate(AdminQuestionBase):
    pass


class AdminQuizCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "description")
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        stripped = value.strip()
        return stripped or None
