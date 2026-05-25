import json
import re
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings
from app.models.submission import Submission, SubmissionType


class AIProviderError(Exception):
    """Raised when the upstream AI provider cannot produce usable feedback."""


class GeneratedFeedback(BaseModel):
    score: int | None = Field(default=None, ge=0, le=100)
    feedback_text: str = Field(min_length=1)
    improved_version: str | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    suggestions: list[str] | None = None

    model_config = ConfigDict(extra="forbid")


def _parse_json(raw: str) -> dict:
    """Parse JSON from Groq response, handling markdown code fences."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


class GroqFeedbackService:
    _SYSTEM_PROMPT = (
        "You are an expert career communication reviewer for an AI learning platform. "
        "Return structured feedback only as JSON. Score the submission from 0 to 100. "
        "Focus on actionable strengths, weaknesses, and concrete next-step suggestions. "
        "If the content is weak or incomplete, still provide constructive feedback."
    )

    def __init__(self) -> None:
        self._api_key = settings.GROQ_API_KEY
        self._model_name = settings.GROQ_MODEL
        self._timeout = settings.GROQ_TIMEOUT_SECONDS

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate_feedback(self, submission: Submission) -> GeneratedFeedback:
        if not self._api_key:
            raise AIProviderError("Groq API key is not configured")

        user_prompt = self._build_user_prompt(submission)

        payload = {
            "model": self._model_name,
            "messages": [
                {"role": "system", "content": self._SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 1000,
            "response_format": {"type": "json_object"},
        }

        try:
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self._timeout,
            )
        except httpx.TimeoutException as exc:
            raise AIProviderError("Groq request timed out") from exc
        except httpx.HTTPError as exc:
            raise AIProviderError("Groq request failed") from exc

        if response.status_code >= 400:
            raise AIProviderError(self._build_error_message(response))

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise AIProviderError("Groq returned no choices")

        content_text = choices[0].get("message", {}).get("content", "")
        try:
            parsed = _parse_json(content_text)
            return GeneratedFeedback.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise AIProviderError("Groq returned an invalid feedback payload") from exc

    def _build_user_prompt(self, submission: Submission) -> str:
        content = submission.content.strip()
        type_instruction = self._type_instruction(submission.submission_type)
        file_context = (
            f"Optional file URL context: {submission.file_url}\n"
            if submission.file_url
            else ""
        )

        return (
            f"Submission type: {submission.submission_type.value}\n"
            f"{type_instruction}\n"
            f"{file_context}"
            "Evaluate the submission and produce JSON.\n"
            "Keep strengths, weaknesses, and suggestions concise.\n"
            f"Submission content:\n{content}\n\n"
            'Return ONLY a JSON object with keys: "score" (int 0-100 or null), '
            '"feedback_text" (string), "improved_version" (string or null), '
            '"strengths" (array or null), "weaknesses" (array or null), "suggestions" (array or null).'
        )

    def _type_instruction(self, submission_type: SubmissionType) -> str:
        instructions = {
            SubmissionType.EMAIL: (
                "Review the writing for clarity, tone, professionalism, and call-to-action quality."
            ),
            SubmissionType.RESUME: (
                "Review the submission like resume content, focusing on impact, clarity, and role alignment."
            ),
            SubmissionType.INTERVIEW: (
                "Review the submission like an interview answer, focusing on specificity, confidence, and structure."
            ),
            SubmissionType.PERSONALITY: (
                "Review the submission like a reflective personality exercise, focusing on depth, clarity, and actionable self-improvement."
            ),
        }
        return instructions[submission_type]

    def _build_error_message(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return f"Groq request failed with status {response.status_code}"

        error = payload.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()
        return f"Groq request failed with status {response.status_code}"


ai_feedback_service = GroqFeedbackService()
