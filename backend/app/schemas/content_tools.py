# /app/schemas/content_tools.py
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Email ──────────────────────────────────────────────────────────────────────

class EmailGenerateRequest(BaseModel):
    """Generate a complete professional email draft from a brief description."""
    recipient_name: Optional[str] = Field(default=None, max_length=100)
    recipient_email: Optional[str] = Field(default=None, max_length=200)
    company_name: Optional[str] = Field(default=None, max_length=200)
    purpose: Optional[str] = Field(default=None, max_length=200)
    tone: str = Field(default="professional", max_length=50)
    subject_hint: Optional[str] = Field(default=None, max_length=200)
    email_prompt: str = Field(..., min_length=5, max_length=2000)
    key_points: list[str] = Field(default_factory=list)
    additional_context: Optional[str] = Field(default=None, max_length=1000)
    call_to_action: Optional[str] = Field(default=None, max_length=300)
    sender_name: Optional[str] = Field(default=None, max_length=100)
    sender_email: Optional[str] = Field(default=None, max_length=200)

    model_config = ConfigDict(extra="forbid")


class EmailGenerateResponse(BaseModel):
    subject: str
    body: str
    preview: str


class EmailAssistRequest(BaseModel):
    """Run a targeted action (grammar check, rewrite, etc.) on an existing email draft."""
    action: str = Field(..., max_length=100)
    recipient_name: Optional[str] = Field(default=None, max_length=100)
    recipient_email: Optional[str] = Field(default=None, max_length=200)
    company_name: Optional[str] = Field(default=None, max_length=200)
    purpose: Optional[str] = Field(default=None, max_length=200)
    tone: str = Field(default="professional", max_length=50)
    sender_name: Optional[str] = Field(default=None, max_length=100)
    sender_email: Optional[str] = Field(default=None, max_length=200)
    subject: str = Field(..., max_length=500)
    body: str = Field(..., min_length=1, max_length=5000)
    instruction: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class EmailAssistResponse(BaseModel):
    action_label: str
    subject: str
    body: str
    preview: str
    quality_score: int = Field(ge=0, le=100)
    report_summary: str
    score_breakdown: dict[str, Any] = Field(default_factory=dict)
    suggestions: list[str] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)
    assistant_note: str


# ── Blog ───────────────────────────────────────────────────────────────────────

class BlogAssistRequest(BaseModel):
    """Run a publish check on a blog draft."""
    action: str = Field(..., max_length=100)
    title: Optional[str] = Field(default=None, max_length=300)
    content: str = Field(..., min_length=1, max_length=20000)
    author_name: Optional[str] = Field(default=None, max_length=100)
    author_email: Optional[str] = Field(default=None, max_length=200)

    model_config = ConfigDict(extra="forbid")


class BlogAssistResponse(BaseModel):
    action_label: str
    quality_score: int = Field(ge=0, le=100)
    report_summary: str
    preview: str
    grammar_mistakes: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    assistant_note: str


class BlogPublishRequest(BaseModel):
    """Publish a pre-checked blog draft privately."""
    author_name: Optional[str] = Field(default=None, max_length=100)
    author_email: str = Field(..., min_length=1, max_length=200)
    title: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1, max_length=20000)
    quality_score: Optional[int] = Field(default=None, ge=0, le=100)
    grammar_mistake_count: int = Field(default=0, ge=0)
    suggestion_count: int = Field(default=0, ge=0)
    review_summary: Optional[str] = Field(default=None, max_length=1000)

    model_config = ConfigDict(extra="forbid")


class BlogPublishResponse(BaseModel):
    id: str
    title: str
    content: str
    preview: str
    word_count: int
    author_name: Optional[str]
    author_email: str
    quality_score: Optional[int]
    grammar_mistake_count: int
    suggestion_count: int
    review_summary: Optional[str]
    published_at: str


# ── AI Custom Resume Generator ──────────────────────────────────────────────────

class PersonalInfoSchema(BaseModel):
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    github: str = ""

class ExperienceItemSchema(BaseModel):
    company: str = ""
    role: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    bullets: list[str] = []

class EducationItemSchema(BaseModel):
    school: str = ""
    degree: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    gpa: str = ""

class ProjectItemSchema(BaseModel):
    title: str = ""
    technologies: list[str] = []
    bullets: list[str] = []

class TailoredResumeResponse(BaseModel):
    personal_info: PersonalInfoSchema
    summary: str = ""
    skills: list[str] = []
    experience: list[ExperienceItemSchema] = []
    education: list[EducationItemSchema] = []
    projects: list[ProjectItemSchema] = []

