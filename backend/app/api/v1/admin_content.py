import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.api_docs import error_responses
from app.core.permissions import require_admin
from app.database import get_db
from app.models.module import Lesson, Module
from app.models.quiz import Option, Question, Quiz
from app.models.user import User
from app.schemas.admin_content import AdminQuestionCreate, AdminQuestionUpdate, AdminQuizCreate


router = APIRouter(prefix="/admin/content", tags=["Admin - Content"])


def _serialize_option(option: Option) -> dict:
    return {
        "option_id": str(option.option_id),
        "text": option.text,
        "is_correct": option.is_correct,
        "explanation": option.explanation,
    }


def _serialize_question(question: Question) -> dict:
    options = sorted(question.options or [], key=lambda item: item.text)
    correct_option = next((option for option in options if option.is_correct), None)
    return {
        "question_id": str(question.question_id),
        "quiz_id": str(question.quiz_id),
        "text": question.text,
        "order": question.order,
        "difficulty_level": question.difficulty_level,
        "placement_relevance": question.placement_relevance,
        "explanation": correct_option.explanation if correct_option else None,
        "options": [_serialize_option(option) for option in options],
        "correct_option_id": str(correct_option.option_id) if correct_option else None,
    }


def _serialize_quiz(quiz: Quiz | None) -> dict | None:
    if not quiz:
        return None

    questions = sorted(quiz.questions or [], key=lambda item: item.order)
    return {
        "quiz_id": str(quiz.quiz_id),
        "module_id": str(quiz.module_id),
        "lesson_id": str(quiz.lesson_id) if quiz.lesson_id else None,
        "title": quiz.title,
        "description": quiz.description,
        "question_count": len(questions),
        "questions": [_serialize_question(question) for question in questions],
    }


def _serialize_lesson(lesson: Lesson, quiz: Quiz | None = None) -> dict:
    return {
        "lesson_id": str(lesson.lesson_id),
        "module_id": str(lesson.module_id),
        "title": lesson.title,
        "content": lesson.content,
        "order": lesson.order,
        "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
        "is_unit_header": bool(lesson.title and lesson.title.lower().startswith("unit ")),
        "quiz": _serialize_quiz(quiz),
    }


def _serialize_module(module: Module) -> dict:
    return {
        "module_id": str(module.module_id),
        "title": module.title,
        "description": module.description,
        "year": module.year,
        "order": module.order,
        "is_premium": module.is_premium,
        "created_at": module.created_at.isoformat() if module.created_at else None,
        "updated_at": module.updated_at.isoformat() if module.updated_at else None,
        "lesson_count": len(module.lessons or []),
    }


def _get_module_or_404(db: Session, module_id: uuid.UUID) -> Module:
    module = (
        db.query(Module)
        .options(
            selectinload(Module.lessons),
            selectinload(Module.quizzes).selectinload(Quiz.questions).selectinload(Question.options),
        )
        .filter(Module.module_id == module_id)
        .first()
    )
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    return module


def _get_lesson_or_404(db: Session, lesson_id: uuid.UUID) -> Lesson:
    lesson = (
        db.query(Lesson)
        .options(selectinload(Lesson.module))
        .filter(Lesson.lesson_id == lesson_id)
        .first()
    )
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


def _get_quiz_or_404(db: Session, quiz_id: uuid.UUID) -> Quiz:
    quiz = (
        db.query(Quiz)
        .options(selectinload(Quiz.questions).selectinload(Question.options))
        .filter(Quiz.quiz_id == quiz_id)
        .first()
    )
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def _get_question_or_404(db: Session, question_id: uuid.UUID) -> Question:
    question = (
        db.query(Question)
        .options(selectinload(Question.options), selectinload(Question.quiz))
        .filter(Question.question_id == question_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


def _apply_question_payload(question: Question, payload: AdminQuestionCreate | AdminQuestionUpdate) -> None:
    question.text = payload.text
    question.order = payload.order
    question.difficulty_level = payload.difficulty_level
    question.placement_relevance = payload.placement_relevance


def _replace_options(db: Session, question: Question, payload: AdminQuestionCreate | AdminQuestionUpdate) -> None:
    for option in list(question.options or []):
        db.delete(option)
    db.flush()

    for option_in in payload.options:
        db.add(
            Option(
                question_id=question.question_id,
                text=option_in.text,
                is_correct=option_in.is_correct,
                explanation=payload.explanation if option_in.is_correct else None,
            )
        )


@router.get("/overview", responses=error_responses(401, 403, 500))
def admin_content_overview(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {
        "total_modules": db.query(Module).count(),
        "total_lessons": db.query(Lesson).count(),
        "total_quizzes": db.query(Quiz).count(),
        "total_questions": db.query(Question).count(),
    }


@router.get("/modules/{module_id}/editor", responses=error_responses(401, 403, 404, 500))
def get_module_editor(
    module_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    module = _get_module_or_404(db, module_id)
    quizzes_by_lesson_id = {
        quiz.lesson_id: quiz
        for quiz in module.quizzes or []
        if quiz.lesson_id is not None
    }
    lessons = sorted(module.lessons or [], key=lambda item: item.order)

    return {
        "module": _serialize_module(module),
        "lessons": [
            _serialize_lesson(lesson, quizzes_by_lesson_id.get(lesson.lesson_id))
            for lesson in lessons
        ],
    }


@router.post(
    "/lessons/{lesson_id}/quiz",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 404, 422, 500),
)
def create_or_replace_lesson_quiz(
    lesson_id: uuid.UUID,
    payload: AdminQuizCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    lesson = _get_lesson_or_404(db, lesson_id)
    existing = db.query(Quiz).filter(Quiz.lesson_id == lesson.lesson_id).first()
    if existing:
        db.delete(existing)
        db.flush()

    quiz = Quiz(
        module_id=lesson.module_id,
        lesson_id=lesson.lesson_id,
        title=payload.title or f"Quiz: {lesson.title}",
        description=payload.description or "Topic quiz",
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return _serialize_quiz(_get_quiz_or_404(db, quiz.quiz_id))


@router.post(
    "/quizzes/{quiz_id}/questions",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 404, 422, 500),
)
def create_question(
    quiz_id: uuid.UUID,
    payload: AdminQuestionCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    quiz = _get_quiz_or_404(db, quiz_id)
    question = Question(quiz_id=quiz.quiz_id)
    _apply_question_payload(question, payload)
    db.add(question)
    db.flush()
    _replace_options(db, question, payload)
    db.commit()
    db.refresh(question)
    return _serialize_question(_get_question_or_404(db, question.question_id))


@router.put("/questions/{question_id}", responses=error_responses(401, 403, 404, 422, 500))
def update_question(
    question_id: uuid.UUID,
    payload: AdminQuestionUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    question = _get_question_or_404(db, question_id)
    _apply_question_payload(question, payload)
    _replace_options(db, question, payload)
    db.commit()
    db.refresh(question)
    return _serialize_question(_get_question_or_404(db, question.question_id))


@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(401, 403, 404, 500),
)
def delete_question(
    question_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    question = _get_question_or_404(db, question_id)
    db.delete(question)
    db.commit()
