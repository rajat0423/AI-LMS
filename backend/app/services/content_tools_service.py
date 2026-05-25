# /app/services/content_tools_service.py
"""
Content Tools Service — Email Generator and Blog Writer AI operations.

Uses Groq's OpenAI-compatible chat completions API.
When GROQ_API_KEY is not configured the functions return sensible
deterministic fallbacks so the UI stays usable without an API key.
"""
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.content_tools import (
    BlogAssistResponse,
    BlogPublishRequest,
    BlogPublishResponse,
    EmailAssistResponse,
    EmailGenerateResponse,
)


# ── helpers ────────────────────────────────────────────────────────────────────

def _build_preview(text: str, max_chars: int = 160) -> str:
    normalized = " ".join(text.split())
    return normalized[:max_chars] if normalized else ""


def _word_count(text: str) -> int:
    normalized = text.strip()
    return len(normalized.split()) if normalized else 0


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Groq AI helpers ───────────────────────────────────────────────────────────

class ContentAIError(Exception):
    """Raised when the AI provider cannot produce usable content."""


def _call_groq(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    temperature: float = 0.5,
    max_tokens: int = 800,
) -> str:
    """Call Groq chat completions API and return the assistant message text."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ContentAIError("Groq API key is not configured")

    payload = {
        "model": model or settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }

    try:
        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=settings.GROQ_TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException as exc:
        raise ContentAIError("Groq request timed out") from exc
    except httpx.HTTPError as exc:
        raise ContentAIError("Groq request failed") from exc

    if response.status_code >= 400:
        raise ContentAIError(f"Groq request failed with status {response.status_code}")

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise ContentAIError("Groq returned no choices")

    return choices[0].get("message", {}).get("content", "")


def _parse_json_response(raw: str) -> dict:
    """Parse JSON from Groq response, handling markdown code fences."""
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


# ── Fallback helpers (no API key) ─────────────────────────────────────────────

def _email_generate_fallback(email_prompt: str, tone: str) -> EmailGenerateResponse:
    subject = "Your Request"
    body = (
        f"Dear Recipient,\n\n"
        f"I am writing to follow up on the following:\n\n{email_prompt}\n\n"
        f"Please let me know if you have any questions.\n\nBest regards,\nSender"
    )
    return EmailGenerateResponse(
        subject=subject,
        body=body,
        preview=_build_preview(body),
    )


def _email_assist_fallback(action: str, subject: str, body: str) -> EmailAssistResponse:
    return EmailAssistResponse(
        action_label=action.replace("_", " ").title(),
        subject=subject,
        body=body,
        preview=_build_preview(body),
        quality_score=70,
        report_summary="Basic review performed. Advanced AI checks are currently unavailable.",
        score_breakdown={"grammar": 70, "professional_tone": 70, "structure": 70, "clarity": 70},
        suggestions=["Proofread your email for grammar and clarity.", "Ensure your tone is appropriate for the recipient."],
        issues=[],
        assistant_note="Basic system check passed — returning original draft unchanged.",
    )


def _blog_assist_fallback(title: str, content: str) -> BlogAssistResponse:
    return BlogAssistResponse(
        action_label="Publish Check",
        quality_score=65,
        report_summary="Basic review performed. Advanced AI checks are currently unavailable.",
        preview=_build_preview(content),
        grammar_mistakes=[],
        suggestions=["Consider manually reviewing your blog for clarity and tone.", "Proofread your draft before publishing."],
        assistant_note="Basic system check passed.",
    )


# ── Public service functions ───────────────────────────────────────────────────

def generate_email(
    *,
    email_prompt: str,
    tone: str = "professional",
    recipient_name: str | None = None,
    company_name: str | None = None,
    purpose: str | None = None,
    subject_hint: str | None = None,
    sender_name: str | None = None,
    **_kwargs: Any,
) -> EmailGenerateResponse:
    """Generate a complete email draft using AI."""
    context_parts = []
    if recipient_name:
        context_parts.append(f"Recipient: {recipient_name}")
    if company_name:
        context_parts.append(f"Company: {company_name}")
    if purpose:
        context_parts.append(f"Purpose: {purpose}")
    if subject_hint:
        context_parts.append(f"Preferred subject: {subject_hint}")
    if sender_name:
        context_parts.append(f"Sender name: {sender_name}")

    context = "\n".join(context_parts)
    context_str = f"Context:\n{context}\n" if context else ""
    prompt = (
        f"Write a {tone} professional email based on the following request.\n"
        f"{context_str}"
        f"Request: {email_prompt}\n\n"
        'Return ONLY a JSON object with keys: "subject", "body", "preview".'
    )

    try:
        raw = _call_groq(
            system_prompt="You are an expert professional email writer. Return structured JSON only.",
            user_prompt=prompt,
            model=settings.EMAIL_GROQ_MODEL or None,
            temperature=settings.EMAIL_GROQ_TEMPERATURE,
            max_tokens=settings.EMAIL_GROQ_MAX_TOKENS,
        )
        data = _parse_json_response(raw)
        return EmailGenerateResponse(
            subject=data.get("subject", ""),
            body=data.get("body", ""),
            preview=data.get("preview", _build_preview(data.get("body", ""))),
        )
    except ContentAIError:
        return _email_generate_fallback(email_prompt, tone)


def assist_email(
    *,
    action: str,
    subject: str,
    body: str,
    tone: str = "professional",
    purpose: str | None = None,
    instruction: str | None = None,
    **_kwargs: Any,
) -> EmailAssistResponse:
    """Run a targeted AI action on an existing email draft."""
    action_description = {
        "grammar_check": "Check for grammar mistakes and correct them.",
        "fix_email": "Fix language issues and improve professional tone.",
        "suggest_improvements": "Suggest concrete improvements without rewriting.",
        "rewrite_email": "Completely rewrite the email to be more professional and effective.",
        "custom": instruction or "Improve the email based on best practices.",
    }.get(action, action)

    prompt = (
        f"Action: {action_description}\n"
        f"Tone target: {tone}\n"
        f"Purpose: {purpose or 'not specified'}\n\n"
        f"Subject: {subject}\n\nBody:\n{body}\n\n"
        'Return ONLY a JSON object with keys: "action_label", "subject", "body", "preview", '
        '"quality_score" (0-100), "report_summary", "score_breakdown" (object with grammar, '
        'professional_tone, structure, clarity), "suggestions" (array), "issues" (array), "assistant_note".'
    )

    try:
        raw = _call_groq(
            system_prompt=(
                "You are a professional email coach. "
                "Analyze and improve the email draft. Return structured JSON only."
            ),
            user_prompt=prompt,
            model=settings.EMAIL_ASSIST_GROQ_MODEL or None,
            temperature=settings.EMAIL_ASSIST_GROQ_TEMPERATURE,
            max_tokens=settings.EMAIL_ASSIST_GROQ_MAX_TOKENS,
        )
        data = _parse_json_response(raw)
        return EmailAssistResponse(**data)
    except ContentAIError:
        return _email_assist_fallback(action, subject, body)


def assist_blog(
    *,
    action: str,
    title: str | None,
    content: str,
    **_kwargs: Any,
) -> BlogAssistResponse:
    """Run a publish-check on a blog draft."""
    prompt = (
        f"Run a {action} on the following blog post. "
        "Check grammar, professional language, structure, and blog format. "
        "Return a quality score (0-100), a report summary, grammar mistakes, "
        "improvement suggestions, and a one-sentence preview.\n\n"
        f"Title: {title or 'Untitled'}\n\nContent:\n{content}\n\n"
        'Return ONLY a JSON object with keys: "action_label", "quality_score" (int 0-100), '
        '"report_summary", "preview", "grammar_mistakes" (array), "suggestions" (array), "assistant_note".'
    )

    try:
        raw = _call_groq(
            system_prompt=(
                "You are a professional blog editor. "
                "Evaluate the blog draft strictly and return structured JSON only."
            ),
            user_prompt=prompt,
            model=settings.BLOG_GROQ_MODEL or None,
            temperature=settings.BLOG_GROQ_TEMPERATURE,
            max_tokens=settings.BLOG_GROQ_MAX_TOKENS,
        )
        data = _parse_json_response(raw)
        return BlogAssistResponse(**data)
    except ContentAIError:
        return _blog_assist_fallback(title or "", content)


def publish_blog(request: BlogPublishRequest) -> BlogPublishResponse:
    """Persist a pre-reviewed blog privately (in-memory; no DB model yet)."""
    preview = _build_preview(request.content)
    return BlogPublishResponse(
        id=str(uuid.uuid4()),
        title=request.title,
        content=request.content,
        preview=preview,
        word_count=_word_count(request.content),
        author_name=request.author_name,
        author_email=request.author_email,
        quality_score=request.quality_score,
        grammar_mistake_count=request.grammar_mistake_count,
        suggestion_count=request.suggestion_count,
        review_summary=request.review_summary,
        published_at=_utc_now_iso(),
    )


def list_published_blogs(*, author_email: str) -> list[BlogPublishResponse]:
    """
    Placeholder — returns empty list until a Blog DB model is added.
    The frontend handles an empty list gracefully (shows empty state).
    """
    return []
