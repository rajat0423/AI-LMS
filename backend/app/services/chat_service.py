# /app/services/chat_service.py
"""
Chat Service — Conversational AI for mock interviews.

Uses Groq's chat completions API to maintain an interview conversation.
Falls back to a scripted interviewer if no API key is configured.
"""
import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ChatServiceError(Exception):
    """Raised when the chat service cannot produce a reply."""


async def chat_reply(
    *,
    session_id: str,
    history: list[dict[str, str]],
    message: str,
    interview_setup: dict[str, Any] | None = None,
) -> dict[str, Any]:
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
    dict
        The next interviewer reply and optional structured feedback for the
        candidate's latest answer.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        return _fallback_result(message, history, interview_setup)

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
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=settings.GROQ_TIMEOUT_SECONDS,
            )

        if response.status_code >= 400:
            logger.warning(f"Groq chat request failed with status {response.status_code}. Using fallback.")
            return _fallback_result(message, history, interview_setup)

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            logger.warning("Groq returned no choices. Using fallback.")
            return _fallback_result(message, history, interview_setup)

        content = choices[0].get("message", {}).get("content", "")
        return _parse_ai_result(content, message, history, interview_setup)

    except Exception as exc:
        logger.warning(f"Groq chat failed with exception: {exc}. Using fallback.")
        return _fallback_result(message, history, interview_setup)


def _build_system_prompt(setup: dict[str, Any] | None) -> str:
    """Build a detailed system prompt from interview_setup parameters."""
    setup = setup or {}

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
        "3. Evaluate the candidate's latest answer against the exact question asked.\n"
        "4. Be specific and honest. Do not praise weak or unsupported claims.\n"
        "5. Identify strengths, mistakes, missing points, and a better answer structure.\n"
        "6. For technical answers, check correctness, depth, trade-offs, and examples.\n"
        "7. For behavioral answers, check STAR structure, ownership, actions, and results.\n"
        "8. Tailor the next question to the role, domain, difficulty, and prior answer.\n\n"
        "The reply must always contain an actual interview question ending in '?'. "
        "Do not return an introduction without the question. If the conversation history "
        "contains an assistant question and the latest user message is an answer, feedback "
        "MUST be a populated object and cannot be null.\n\n"
        "Return ONLY valid JSON using this exact shape:\n"
        "{\n"
        '  "reply": "One next interview question only",\n'
        '  "feedback": null\n'
        "}\n"
        "When the user has answered an interview question, feedback must instead be:\n"
        "{\n"
        '  "reply": "One next interview question only",\n'
        '  "feedback": {\n'
        '    "question": "The question that was evaluated",\n'
        '    "answer_summary": "Brief summary of the candidate answer",\n'
        '    "overall_score": 0,\n'
        '    "scores": {"relevance": 0, "clarity": 0, "structure": 0, "depth": 0},\n'
        '    "strengths": ["Specific strength"],\n'
        '    "mistakes": ["Specific mistake and why it hurts the answer"],\n'
        '    "missing_points": ["Important point the answer omitted"],\n'
        '    "better_approach": ["Concrete step for a stronger answer"],\n'
        '    "improved_answer": "A realistic improved answer that does not invent experience"\n'
        "  }\n"
        "}\n"
        "All scores are integers from 0 to 100. Use empty arrays only when truly appropriate."
    )


def _parse_ai_result(
    content: str,
    message: str,
    history: list[dict[str, str]],
    setup: dict[str, Any] | None,
) -> dict[str, Any]:
    try:
        parsed = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Groq returned invalid interview JSON. Using fallback.")
        return _fallback_result(message, history, setup)

    reply = str(parsed.get("reply", "")).strip()
    fallback = None
    if not reply or "?" not in reply:
        fallback = _fallback_result(message, history, setup)
        reply = fallback["reply"]
    previous_question = next(
        (
            entry.get("text", "").strip()
            for entry in reversed(history)
            if entry.get("role") == "ai" and entry.get("text", "").strip()
        ),
        "",
    )
    if previous_question and _normalize_text(reply) == _normalize_text(previous_question):
        fallback = fallback or _fallback_result(message, history, setup)
        reply = fallback["reply"]

    feedback = parsed.get("feedback")
    if feedback is not None and not isinstance(feedback, dict):
        feedback = None
    has_answered_question = any(
        entry.get("role") == "ai" and entry.get("text", "").strip()
        for entry in history
    )
    if has_answered_question and not feedback:
        feedback = _build_fallback_feedback(message, history, setup)

    return {"reply": reply, "feedback": feedback}


def _normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _fallback_result(
    message: str,
    history: list[dict[str, str]],
    setup: dict[str, Any] | None,
) -> dict[str, Any]:
    """Structured local fallback when no Groq API key is configured."""
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
        return {
            "reply": (
                f"Welcome! I'm your AI Interview Coach. Let's practice for the {role} role. "
                f"Let's start: {fallback_questions[0]}"
            ),
            "feedback": None,
        }

    if question_count >= len(fallback_questions):
        next_question = "What is one answer from this interview that you would improve, and how?"
    else:
        next_question = fallback_questions[min(question_count, len(fallback_questions) - 1)]

    return {
        "reply": next_question,
        "feedback": _build_fallback_feedback(message, history, setup),
    }


def _build_fallback_feedback(
    answer: str,
    history: list[dict[str, str]],
    setup: dict[str, Any] | None,
) -> dict[str, Any]:
    question = next(
        (
            entry.get("text", "").strip()
            for entry in reversed(history)
            if entry.get("role") == "ai" and entry.get("text", "").strip()
        ),
        "Previous interview question",
    )
    clean_answer = " ".join(answer.split())
    words = clean_answer.split()
    word_count = len(words)
    lower_answer = clean_answer.lower()
    lower_question = question.lower()
    interview_type = (setup or {}).get("interview_type", "technical")
    stop_words = {
        "about", "after", "before", "could", "explain", "have", "into", "role",
        "should", "tell", "that", "their", "there", "these", "this", "what",
        "when", "where", "which", "with", "would", "your", "yourself",
    }
    question_terms = {
        word
        for word in re.findall(r"[a-z0-9+#.]+", lower_question)
        if len(word) > 3 and word not in stop_words
    }
    answer_terms = set(re.findall(r"[a-z0-9+#.]+", lower_answer))
    addresses_question = bool(question_terms & answer_terms)

    has_example = any(
        phrase in lower_answer
        for phrase in ("for example", "in my project", "when i", "during", "i built", "i worked")
    )
    has_result = any(
        phrase in lower_answer
        for phrase in ("result", "improved", "reduced", "increased", "achieved", "learned", "%")
    ) or bool(re.search(r"\b\d+(?:\.\d+)?\b", clean_answer))
    has_action = any(
        phrase in lower_answer
        for phrase in ("i created", "i implemented", "i designed", "i solved", "i analyzed", "i led")
    )

    if "tell me about yourself" in lower_question:
        relevance = 78 if word_count >= 12 else 52
    elif interview_type == "technical" and question_terms and not addresses_question:
        relevance = 25
    else:
        relevance = 78 if word_count >= 12 else 52
    clarity = 82 if 20 <= word_count <= 180 else 62
    structure = 58 + (12 if has_example else 0) + (12 if has_action else 0) + (12 if has_result else 0)
    depth = 48 + min(word_count, 60) // 3 + (12 if has_example else 0) + (12 if has_result else 0)
    scores = {
        "relevance": min(relevance, 100),
        "clarity": min(clarity, 100),
        "structure": min(structure, 100),
        "depth": min(depth, 100),
    }

    strengths = []
    mistakes = []
    missing_points = []
    better_approach = []

    if word_count >= 20:
        strengths.append("The answer provides enough context to evaluate your main point.")
    if has_action:
        strengths.append("You use ownership language that makes your contribution clearer.")
    if has_example:
        strengths.append("You support the answer with an example instead of only making a claim.")
    if has_result:
        strengths.append("You mention an outcome, which makes the answer more credible.")
    if not strengths:
        strengths.append("You answered directly without unnecessary detours.")

    if word_count < 20:
        mistakes.append(
            "The answer is too brief to demonstrate evidence, depth, or role readiness."
        )
    if interview_type == "technical" and question_terms and not addresses_question:
        mistakes.append(
            "The answer does not address the technical question that was asked. Start by answering the core concept directly."
        )
    if not has_example:
        mistakes.append(
            "The answer makes claims without a concrete situation or project example."
        )
    if not has_action:
        mistakes.append(
            "Your personal actions are unclear; explain what you specifically did rather than only the general situation."
        )
    if not has_result:
        mistakes.append(
            "There is no clear result, impact, or lesson, so the interviewer cannot judge effectiveness."
        )
    if word_count > 180:
        mistakes.append(
            "The answer is longer than necessary; lead with the main point and remove repeated context."
        )

    if "tell me about yourself" in lower_question:
        missing_points.extend([
            "A concise present-past-future structure.",
            "One or two role-relevant skills supported by a project or achievement.",
            "A clear connection between your background and this role.",
        ])
        better_approach.extend([
            "Start with your current education or professional focus.",
            "Highlight one relevant project, skill, or achievement with evidence.",
            "Close by explaining why this role is the logical next step.",
        ])
    elif "motivated" in lower_question or "apply" in lower_question:
        missing_points.extend([
            "A specific reason this role or domain interests you.",
            "Evidence from your experience that supports the motivation.",
            "How the opportunity connects to your longer-term growth.",
        ])
        better_approach.extend([
            "Name the part of the role that genuinely interests you.",
            "Connect that interest to a relevant project, skill, or learning experience.",
            "Explain the value you hope to contribute and develop.",
        ])
    elif "project" in lower_question:
        missing_points.extend([
            "The project goal and your exact responsibility.",
            "The technical decisions, constraints, or trade-offs you handled.",
            "A measurable result and what you learned.",
        ])
        better_approach.extend([
            "Use Situation, Task, Action, Result, then add the lesson learned.",
            "Name the tools used only where they explain your decisions.",
            "Quantify the result when you have a genuine metric.",
        ])
    else:
        missing_points.extend([
            "A specific example that proves the main claim.",
            "Your individual actions and decision-making.",
            "The result, lesson, and relevance to the target role.",
        ])
        better_approach.extend([
            "Answer the question directly in the first sentence.",
            "Add one concise example with context, your action, and the outcome.",
            "End by linking the lesson or skill back to the role.",
        ])

    if interview_type == "technical":
        missing_points.append(
            "Technical reasoning such as why you chose an approach, alternatives considered, and trade-offs."
        )

    overall_score = round(sum(scores.values()) / len(scores))
    if "tell me about yourself" in lower_question:
        improved_answer = (
            "I recently completed my graduation in [field]. During my studies, I developed "
            "skills in [two relevant skills] and applied them in [project or internship], where "
            "I was responsible for [specific contribution]. That experience strengthened my "
            "interest in this role, and I am now looking for an opportunity to contribute while "
            "continuing to grow in [role-relevant area]."
        )
    elif "motivated" in lower_question or "apply" in lower_question:
        improved_answer = (
            "I am motivated by this role because [specific responsibility or domain] matches the "
            "work I enjoyed during [project, course, or internship]. In that experience, I "
            "[specific action or achievement], which confirmed that I want to grow in this area. "
            "This opportunity would let me contribute my current skills in [skill] while building "
            "deeper experience in [growth area]."
        )
    else:
        improved_answer = (
            "My main point is [direct answer]. For example, in [specific situation], I was "
            "responsible for [task]. I [two or three concrete actions], which led to [honest "
            "result]. I learned [lesson], and that is relevant to this role because [connection]."
        )

    return {
        "question": question,
        "answer_summary": clean_answer[:240],
        "overall_score": overall_score,
        "scores": scores,
        "strengths": strengths,
        "mistakes": mistakes,
        "missing_points": missing_points,
        "better_approach": better_approach,
        "improved_answer": improved_answer,
    }
