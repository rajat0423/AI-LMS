# /app/services/chat_service.py
"""
Chat Service — Conversational AI for mock interviews.

Uses Groq's chat completions API to maintain an interview conversation.
Falls back to a scripted interviewer if no API key is configured.
"""
import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ChatServiceError(Exception):
    """Raised when the chat service cannot produce a reply."""


def chat_reply(
    *,
    session_id: str,
    history: list[dict[str, str]],
    message: str,
    interview_setup: dict[str, Any] | None = None,
) -> str:
    """
    Generate a conversational reply for a mock interview session.

    Parameters
    ----------
    session_id : str
        Unique session identifier (for future persistence).
    history : list[dict]
        Previous messages in [{"role": "user"|"ai", "text": "..."}] format.
    message : str
        Current user message.
    interview_setup : dict, optional
        Contains target_role, company_name, domain, interview_type,
        difficulty, candidate_name, candidate_background, key_points.

    Returns
    -------
    str
        The AI interviewer's reply text.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        return _fallback_reply(message, history, interview_setup)

    # Build the system prompt from interview_setup if provided
    system_prompt = _build_system_prompt(interview_setup)

    # Convert history to Groq messages format
    messages = [{"role": "system", "content": system_prompt}]
    for entry in history:
        role = "assistant" if entry.get("role") == "ai" else "user"
        messages.append({"role": role, "content": entry.get("text", "")})

    # Add current message
    messages.append({"role": "user", "content": message})

    model = settings.CHAT_GROQ_MODEL or settings.GROQ_MODEL

    payload = {
        "model": model,
        "messages": messages,
        "temperature": settings.CHAT_GROQ_TEMPERATURE,
        "max_tokens": settings.CHAT_GROQ_MAX_TOKENS,
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
        raise ChatServiceError("Groq request timed out") from exc
    except httpx.HTTPError as exc:
        raise ChatServiceError("Groq request failed") from exc

    if response.status_code >= 400:
        error_msg = f"Groq chat failed with status {response.status_code}"
        try:
            error_data = response.json()
            if isinstance(error_data.get("error"), dict):
                error_msg = error_data["error"].get("message", error_msg)
        except Exception:
            pass
        raise ChatServiceError(error_msg)

    data = response.json()
    choices = data.get("choices", [])
    if not choices:
        raise ChatServiceError("Groq returned no choices")

    return choices[0].get("message", {}).get("content", "I couldn't generate a response.")


def _build_system_prompt(setup: dict[str, Any] | None) -> str:
    """Build a detailed system prompt from interview_setup parameters."""
    if not setup:
        return (
            "You are an AI Interview Coach. Ask one interview question at a time. "
            "Wait for the user to answer before asking the next question. "
            "Provide brief, constructive feedback after each answer. "
            "Be encouraging but honest. Keep responses concise."
        )

    role = setup.get("target_role", "general position")
    company = setup.get("company_name", "")
    domain = setup.get("domain", "")
    interview_type = setup.get("interview_type", "technical")
    difficulty = setup.get("difficulty", "medium")
    candidate_name = setup.get("candidate_name", "the candidate")
    background = setup.get("candidate_background", "")
    key_points = setup.get("key_points", [])

    company_ctx = f" at {company}" if company else ""
    domain_ctx = f" in the {domain} domain" if domain else ""
    key_points_text = "\n".join(f"- {kp}" for kp in key_points) if key_points else "No specific key points."

    difficulty_instructions = {
        "easy_fresher": "Ask simple, entry-level questions. Be very encouraging and supportive.",
        "medium": "Ask balanced questions with moderate follow-ups. Give fair feedback.",
        "hard": "Ask challenging questions with pressure follow-ups. Be critical but constructive.",
    }
    diff_text = difficulty_instructions.get(difficulty, difficulty_instructions["medium"])

    type_instructions = {
        "hr": "Focus on behavioral questions, motivation, teamwork, communication, and career goals.",
        "technical": "Focus on technical knowledge, problem-solving, projects, tools, and domain concepts.",
    }
    type_text = type_instructions.get(interview_type, type_instructions["technical"])

    return (
        f"You are an AI Interview Coach conducting a {interview_type} interview "
        f"for a {role} role{company_ctx}{domain_ctx}.\n\n"
        f"Difficulty: {difficulty}. {diff_text}\n"
        f"Interview focus: {type_text}\n\n"
        f"Candidate: {candidate_name}\n"
        f"Background: {background or 'Not provided'}\n"
        f"Key points:\n{key_points_text}\n\n"
        "RULES:\n"
        "1. Ask ONE question at a time.\n"
        "2. Wait for the candidate to answer before asking the next question.\n"
        "3. After each answer, give brief feedback (1-2 sentences) then ask the next question.\n"
        "4. Keep your responses concise and natural.\n"
        "5. After 5-7 questions, summarize the interview performance.\n"
        "6. Tailor questions to the candidate's background and key points."
    )


def _fallback_reply(
    message: str,
    history: list[dict[str, str]],
    setup: dict[str, Any] | None,
) -> str:
    """Scripted fallback when no Groq API key is configured."""
    question_count = sum(1 for h in history if h.get("role") == "ai")

    fallback_questions = [
        "Tell me about yourself and your background.",
        "What motivated you to apply for this role?",
        "Describe a challenging project you've worked on.",
        "How do you handle tight deadlines and pressure?",
        "What are your key strengths and how do they align with this role?",
        "Where do you see yourself in 3-5 years?",
        "Do you have any questions for me?",
    ]

    if question_count == 0:
        role = setup.get("target_role", "this position") if setup else "this position"
        return (
            f"Welcome! I'm your AI Interview Coach. Let's practice for the {role} role. "
            f"Let's start: {fallback_questions[0]}"
        )

    if question_count >= len(fallback_questions):
        return (
            "Great job completing the practice interview! "
            "To get AI-powered feedback and adaptive questions, "
            "please configure a GROQ_API_KEY in the backend environment."
        )

    return (
        f"Thank you for your answer. Here's the next question: "
        f"{fallback_questions[min(question_count, len(fallback_questions) - 1)]}"
    )
