# /app/api/v1/chat.py
"""
Chat route — Conversational AI interview endpoint.
"""
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.chat_service import ChatServiceError, chat_reply

router = APIRouter(tags=["Chat"])


class ChatHistoryEntry(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    session_id: str
    history: list[ChatHistoryEntry] = []
    message: str
    interview_setup: Optional[dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request_data: ChatRequest):
    """
    Conversational chat endpoint for AI mock interviews.

    Accepts session history and returns an AI interviewer reply.
    Works with or without interview_setup context.
    """
    try:
        reply = chat_reply(
            session_id=request_data.session_id,
            history=[{"role": h.role, "text": h.text} for h in request_data.history],
            message=request_data.message,
            interview_setup=request_data.interview_setup,
        )
        return ChatResponse(reply=reply)
    except ChatServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
