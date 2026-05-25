# /app/api/v1/search.py
"""Global search endpoint — searches modules, lessons, and tools."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.core.security import get_current_user_from_token
from app.models.user import User
from app.models.module import Module, Lesson
from app.services import module_service

router = APIRouter(tags=["Search"])

TOOL_CATALOG = [
    {"type": "tool", "name": "AI Interviewer", "description": "Practice mock interviews with AI", "path": "/interview"},
    {"type": "tool", "name": "Resume Analyzer", "description": "Get ATS score and keyword analysis", "path": "/resume"},
    {"type": "tool", "name": "Email Generator", "description": "Draft professional emails with AI", "path": "/email-writer"},
    {"type": "tool", "name": "Blog Writer", "description": "Write and publish blogs with AI review", "path": "/blog-writer"},
    {"type": "tool", "name": "Speaking Exercise", "description": "Practice speaking skills", "path": "/speaking"},
    {"type": "tool", "name": "Read Comprehension", "description": "Improve reading comprehension", "path": "/read-comprehension"},
    {"type": "tool", "name": "Employability Report", "description": "View your career readiness report", "path": "/report"},
    {"type": "tool", "name": "AI Tools Hub", "description": "All AI-powered tools in one place", "path": "/ai-tools"},
    {"type": "tool", "name": "Profile", "description": "View your profile and progress", "path": "/profile"},
    {"type": "tool", "name": "Dashboard", "description": "Your learning dashboard", "path": "/dashboard"},
    {"type": "tool", "name": "Settings", "description": "Account settings and preferences", "path": "/settings"},
]


@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    """
    Search across modules, lessons, and platform tools.
    Returns categorized results for the Cmd+K search modal.
    """
    query_lower = q.lower().strip()
    results = []

    # Search tools/pages
    for tool in TOOL_CATALOG:
        if query_lower in tool["name"].lower() or query_lower in tool["description"].lower():
            results.append(tool)

    # Search modules
    modules_query = db.query(Module).filter(
        or_(
            Module.title.ilike(f"%{q}%"),
            Module.description.ilike(f"%{q}%"),
        )
    )
    modules = module_service._apply_module_access(modules_query, current_user).limit(5).all()

    for mod in modules:
        results.append({
            "type": "module",
            "name": mod.title,
            "description": mod.description or "",
            "path": f"/read-comprehension",
            "id": str(mod.module_id),
        })

    # Search lessons
    lesson_query = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.module_id)
        .filter(Lesson.title.ilike(f"%{q}%"))
    )
    if current_user.role_name == "student":
        lesson_query = lesson_query.filter(Module.year == current_user.year)
    lessons = lesson_query.limit(5).all()

    for lesson in lessons:
        results.append({
            "type": "lesson",
            "name": lesson.title,
            "description": f"Lesson content",
            "path": f"/read-comprehension",
            "id": str(lesson.lesson_id),
        })

    return {"query": q, "results": results[:15], "total": len(results)}
