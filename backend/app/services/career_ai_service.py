import json
import re
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings


class CareerAIProviderError(Exception):
    """Raised when the upstream AI provider cannot produce usable career analysis."""


class CareerResumeMatchResult(BaseModel):
    match_percentage: int = Field(ge=0, le=100)
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    analysis_summary: str = Field(min_length=1)

    model_config = ConfigDict(extra="forbid")


class CareerInterviewFeedbackResult(BaseModel):
    overall_score: int | None = Field(default=None, ge=0, le=100)
    feedback_summary: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvement_areas: list[str] = Field(default_factory=list)
    better_answer_suggestions: list[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


def _parse_json(raw: str) -> dict:
    """Parse JSON from Groq response, handling markdown code fences."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


class GroqCareerAIService:
    def __init__(self) -> None:
        self._api_key = settings.GROQ_API_KEY
        self._model_name = settings.GROQ_MODEL
        self._timeout = settings.GROQ_TIMEOUT_SECONDS

    def generate_resume_match(
        self,
        *,
        resume_text: str,
        job_description: str,
    ) -> CareerResumeMatchResult:
        prompt = (
            "Compare this resume against the job description and return only JSON. "
            "Identify matched keywords, missing keywords, an overall match percentage, "
            "and a concise analysis summary.\n\n"
            f"Resume text:\n{resume_text}\n\n"
            f"Job description:\n{job_description}\n\n"
            'Return ONLY a JSON object with keys: "match_percentage" (int 0-100), '
            '"matched_keywords" (array), "missing_keywords" (array), "analysis_summary" (string).'
        )
        raw = self._call_groq(
            prompt=prompt,
            system_prompt=(
                "You are an expert resume reviewer. "
                "Return deterministic structured analysis only as JSON."
            ),
        )
        try:
            data = _parse_json(raw)
            return CareerResumeMatchResult.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise CareerAIProviderError(
                "Groq returned an invalid resume match payload"
            ) from exc

    def generate_interview_feedback(
        self,
        *,
        role_applied: str | None,
        job_description: str | None,
        questions: list[str],
        answers: list[str],
    ) -> CareerInterviewFeedbackResult:
        interview_pairs = "\n\n".join(
            f"Question {index + 1}: {question}\nAnswer {index + 1}: {answer}"
            for index, (question, answer) in enumerate(zip(questions, answers, strict=True))
        )
        prompt = (
            "Review this text-only mock interview session and return only JSON. "
            "Assess the answers, give an overall score, summary feedback, strengths, "
            "improvement areas, and better-answer suggestions.\n\n"
            f"Role applied: {role_applied or 'general'}\n"
            f"Job description context: {job_description or 'Not provided'}\n\n"
            f"{interview_pairs}\n\n"
            'Return ONLY a JSON object with keys: "overall_score" (int 0-100 or null), '
            '"feedback_summary" (array of strings), "strengths" (array), '
            '"improvement_areas" (array), "better_answer_suggestions" (array).'
        )
        raw = self._call_groq(
            prompt=prompt,
            system_prompt=(
                "You are an expert interview coach. "
                "Return deterministic structured interview feedback only as JSON."
            ),
        )
        try:
            data = _parse_json(raw)
            return CareerInterviewFeedbackResult.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise CareerAIProviderError(
                "Groq returned an invalid interview feedback payload"
            ) from exc

    def _call_groq(
        self,
        *,
        prompt: str,
        system_prompt: str,
    ) -> str:
        if not self._api_key:
            raise CareerAIProviderError("Groq API key is not configured")

        payload = {
            "model": self._model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
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
            raise CareerAIProviderError("Groq request timed out") from exc
        except httpx.HTTPError as exc:
            raise CareerAIProviderError("Groq request failed") from exc

        if response.status_code >= 400:
            raise CareerAIProviderError(self._build_error_message(response))

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise CareerAIProviderError("Groq returned no choices")

        return choices[0].get("message", {}).get("content", "")

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


career_ai_service = GroqCareerAIService()
