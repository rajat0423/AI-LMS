import uuid
import random
import re
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.core.security import get_current_user_from_token
from app.models.quiz import Quiz, Question, Option, QuizAttempt, QuestionAttempt, QuestionBookmark
from app.models.user import User
from app.services import module_service, progress_service
from app.core.cache import cache_get, cache_set

router = APIRouter(prefix="/quiz", tags=["Quizzes"])


class QuestionAttemptRequest(BaseModel):
    selected_option_id: uuid.UUID
    mode: str = Field(default="learning", min_length=1, max_length=20)
    time_spent_seconds: int | None = Field(default=None, ge=0)

    model_config = ConfigDict(extra="forbid")


class QuestionBookmarkRequest(BaseModel):
    is_bookmarked: bool = True

    model_config = ConfigDict(extra="forbid")


def _is_unit_header(title: str | None) -> bool:
    return bool(title and title.lower().startswith("unit "))


def _group_module_lessons(module):
    lessons = sorted(module.lessons or [], key=lambda lesson: lesson.order)
    unit_headers = [lesson for lesson in lessons if _is_unit_header(lesson.title)]
    topics = [lesson for lesson in lessons if not _is_unit_header(lesson.title)]

    grouped_units = []
    for unit in unit_headers:
        expected_prefix = unit.order * 10
        unit_topics = [
            topic
            for topic in topics
            if expected_prefix <= topic.order < expected_prefix + 10
        ]
        grouped_units.append((unit, unit_topics))

    return grouped_units


def _serialize_quiz_for_student(quiz: Quiz, randomize: bool = True):
    """Serialize quiz masking is_correct, optionally randomizing question order."""
    questions = list(quiz.questions)
    if randomize:
        random.shuffle(questions)
    q_dict = {
        "quiz_id": str(quiz.quiz_id),
        "title": quiz.title,
        "description": quiz.description,
        "questions": []
    }
    for qs in questions:
        opts = list(qs.options)
        random.shuffle(opts)
        q_dict["questions"].append({
            "question_id": str(qs.question_id),
            "text": qs.text,
            "order": qs.order,
            "options": [{"option_id": str(o.option_id), "text": o.text} for o in opts]
        })
    return q_dict


def _normalize_topic_title(topic_title: str) -> str:
    return re.sub(r"^\s*\W+\s*", "", topic_title).strip()


def _build_recruiter_focus(*, topic_title: str, placement_relevance: str, difficulty_level: str) -> str:
    clean_topic = _normalize_topic_title(topic_title)
    return (
        f"Recruiters use questions like this to gauge {placement_relevance.lower()} "
        f"while you explain {clean_topic} at a {difficulty_level.lower()} level."
    )


def _infer_blooms_level(question_text: str, order: int) -> str:
    text = question_text.lower()
    if text.startswith("what is") or text.startswith("which of") or "stands for" in text:
        return "Remember"
    if "why" in text or "best helps" in text or "means" in text:
        return "Understand"
    if "example" in text or "how should" in text or "used to" in text:
        return "Apply"
    if "difference" in text or "analyze" in text or "improves" in text:
        return "Analyze"
    blooms_cycle = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
    return blooms_cycle[(order - 1) % len(blooms_cycle)]


def _infer_course_outcome(topic_title: str, placement_relevance: str) -> str:
    normalized = f"{topic_title} {placement_relevance}".lower()
    if "email" in normalized or "written" in normalized:
        return "CO3"
    if "team" in normalized or "collaboration" in normalized:
        return "CO4"
    if "interview" in normalized or "spoken" in normalized:
        return "CO2"
    return "CO1"


def _extract_concepts(topic_title: str, question_text: str) -> list[str]:
    stop_words = {
        "which", "what", "why", "with", "from", "that", "this", "into", "your", "their",
        "about", "through", "under", "because", "means", "helps", "best", "following",
        "these", "those", "would", "should", "does", "have", "when", "where", "while",
    }
    concepts: list[str] = []

    def add_term(term: str):
        normalized = re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")
        if normalized and normalized not in concepts:
            concepts.append(normalized)

    for token in re.split(r"[\s/&,-]+", _normalize_topic_title(topic_title)):
        if len(token) > 2:
            add_term(token)
        if len(concepts) >= 3:
            return concepts[:3]

    for token in re.findall(r"[a-zA-Z]{4,}", question_text.lower()):
        if token not in stop_words:
            add_term(token)
        if len(concepts) >= 3:
            return concepts[:3]

    return concepts[:3] or ["mcq-concept"]


def _serialize_study_question(question: Question, *, topic_title: str):
    options = list(question.options)
    correct_option = next((option for option in options if option.is_correct), None)
    difficulty_level = question.difficulty_level or "Medium"
    placement_relevance = question.placement_relevance or "Core placement readiness"
    blooms_level = _infer_blooms_level(question.text, question.order or 1)
    course_outcome = _infer_course_outcome(topic_title, placement_relevance)
    concepts_tested = _extract_concepts(topic_title, question.text)

    return {
        "question_id": str(question.question_id),
        "question_code": f"Q{question.order or 1}",
        "text": question.text,
        "order": question.order,
        "difficulty_level": difficulty_level,
        "blooms_level": blooms_level,
        "course_outcome": course_outcome,
        "placement_relevance": placement_relevance,
        "concepts_tested": concepts_tested,
        "recruiter_focus": _build_recruiter_focus(
            topic_title=topic_title,
            placement_relevance=placement_relevance,
            difficulty_level=difficulty_level,
        ),
        "options": [
            {
                "option_id": str(option.option_id),
                "text": option.text,
            }
            for option in options
        ],
        "correct_option_id": str(correct_option.option_id) if correct_option else None,
        "correct_option_text": correct_option.text if correct_option else None,
        "explanation": correct_option.explanation if correct_option else None,
    }


def _serialize_attempt_state(attempt: QuestionAttempt | None, question: Question):
    if not attempt:
        return None

    options_by_id = {str(option.option_id): option for option in question.options}
    selected_option = options_by_id.get(str(attempt.selected_option_id))
    correct_option = next((option for option in question.options if option.is_correct), None)

    return {
        "selected_option_id": str(attempt.selected_option_id),
        "selected_option_text": selected_option.text if selected_option else None,
        "correct_option_id": str(correct_option.option_id) if correct_option else None,
        "correct_option_text": correct_option.text if correct_option else None,
        "is_correct": attempt.is_correct,
        "mode": attempt.mode,
        "time_spent_seconds": attempt.time_spent_seconds,
        "attempted_at": attempt.attempted_at.isoformat() if attempt.attempted_at else None,
    }


def _serialize_module_study_bank(
    module,
    quizzes: list[Quiz],
    *,
    attempts_by_question_id: dict[str, QuestionAttempt],
    bookmarked_question_ids: set[str],
):
    quizzes_by_lesson_id = {
        str(quiz.lesson_id): quiz
        for quiz in quizzes
        if quiz.lesson_id is not None
    }
    units = []

    for unit, topics in _group_module_lessons(module):
        serialized_topics = []
        for topic in topics:
            quiz = quizzes_by_lesson_id.get(str(topic.lesson_id))
            questions = sorted((quiz.questions if quiz else []), key=lambda item: item.order)
            serialized_topics.append(
                {
                    "lesson_id": str(topic.lesson_id),
                    "title": _normalize_topic_title(topic.title),
                    "content": topic.content,
                    "quiz_id": str(quiz.quiz_id) if quiz else None,
                    "question_count": len(questions),
                    "questions": [
                        {
                            **_serialize_study_question(question, topic_title=topic.title),
                            "attempt_state": _serialize_attempt_state(
                                attempts_by_question_id.get(str(question.question_id)),
                                question,
                            ),
                            "is_bookmarked": str(question.question_id) in bookmarked_question_ids,
                        }
                        for question in questions
                    ],
                }
            )

        units.append(
            {
                "lesson_id": str(unit.lesson_id),
                "title": unit.title,
                "content": unit.content,
                "topic_count": len(serialized_topics),
                "question_count": sum(topic["question_count"] for topic in serialized_topics),
                "topics": serialized_topics,
            }
        )

    return {
        "module_id": str(module.module_id),
        "module_title": module.title,
        "year": module.year,
        "units": units,
    }


def _percentage(part: int, total: int) -> int:
    return round((part / total) * 100) if total > 0 else 0


def _build_module_analytics(
    module,
    quizzes: list[Quiz],
    *,
    attempts_by_question_id: dict[str, QuestionAttempt],
    bookmarked_question_ids: set[str],
):
    topics = []
    for _unit, unit_topics in _group_module_lessons(module):
        topics.extend(unit_topics)

    quiz_by_lesson_id = {
        str(quiz.lesson_id): quiz
        for quiz in quizzes
        if quiz.lesson_id is not None
    }

    total_questions = 0
    attempted_count = 0
    correct_count = 0
    topic_breakdown = []
    difficulty_breakdown: dict[str, dict[str, int]] = {}
    bloom_breakdown: dict[str, dict[str, int]] = {}
    outcome_breakdown: dict[str, dict[str, int]] = {}
    concept_breakdown: dict[str, dict[str, int]] = {}

    def add_bucket(bucket: dict[str, dict[str, int]], key: str, attempt: QuestionAttempt | None):
        stats = bucket.setdefault(key, {"total": 0, "attempted": 0, "correct": 0, "accuracy_percentage": 0})
        stats["total"] += 1
        if attempt:
            stats["attempted"] += 1
            if attempt.is_correct:
                stats["correct"] += 1

    for topic in topics:
        quiz = quiz_by_lesson_id.get(str(topic.lesson_id))
        questions = sorted((quiz.questions if quiz else []), key=lambda item: item.order)
        topic_attempted = 0
        topic_correct = 0

        for question in questions:
            attempt = attempts_by_question_id.get(str(question.question_id))
            difficulty_level = question.difficulty_level or "Medium"
            placement_relevance = question.placement_relevance or "Core placement readiness"
            blooms_level = _infer_blooms_level(question.text, question.order or 1)
            course_outcome = _infer_course_outcome(topic.title, placement_relevance)

            total_questions += 1
            add_bucket(difficulty_breakdown, difficulty_level, attempt)
            add_bucket(bloom_breakdown, blooms_level, attempt)
            add_bucket(outcome_breakdown, course_outcome, attempt)

            # Parse concepts from placement_relevance: "{bloom} | {co} | {concept1}, {concept2}, {concept3}"
            parts = [p.strip() for p in placement_relevance.split("|")]
            concepts = []
            if len(parts) >= 3:
                concepts = [c.strip() for c in parts[2].split(",") if c.strip()]
            if not concepts:
                concepts = _extract_concepts(topic.title, question.text)
            for concept in concepts:
                add_bucket(concept_breakdown, concept, attempt)

            if attempt:
                attempted_count += 1
                topic_attempted += 1
                if attempt.is_correct:
                    correct_count += 1
                    topic_correct += 1

        topic_total = len(questions)
        topic_breakdown.append(
            {
                "lesson_id": str(topic.lesson_id),
                "title": _normalize_topic_title(topic.title),
                "total_questions": topic_total,
                "attempted": topic_attempted,
                "correct": topic_correct,
                "completion_percentage": _percentage(topic_attempted, topic_total),
                "accuracy_percentage": _percentage(topic_correct, topic_attempted),
            }
        )

    for bucket in (difficulty_breakdown, bloom_breakdown, outcome_breakdown, concept_breakdown):
        for stats in bucket.values():
            stats["accuracy_percentage"] = _percentage(stats["correct"], stats["attempted"])

    # Build completion trend over time (by date)
    trend_by_date = defaultdict(lambda: {"attempted": 0, "correct": 0})
    
    # Helper key function to handle potential datetime vs string types
    def get_attempt_time(att: QuestionAttempt):
        t = att.attempted_at or att.created_at
        if isinstance(t, str):
            try:
                return datetime.fromisoformat(t.replace("Z", "+00:00"))
            except Exception:
                return datetime.min
        return t

    sorted_attempts = sorted(attempts_by_question_id.values(), key=get_attempt_time)
    for attempt in sorted_attempts:
        t = attempt.attempted_at or attempt.created_at
        if isinstance(t, str):
            date_str = t[:10]
        else:
            date_str = t.date().isoformat()
        trend_by_date[date_str]["attempted"] += 1
        if attempt.is_correct:
            trend_by_date[date_str]["correct"] += 1

    completion_trend = []
    cumulative_attempted = 0
    cumulative_correct = 0
    for date_str in sorted(trend_by_date.keys()):
        day_stats = trend_by_date[date_str]
        cumulative_attempted += day_stats["attempted"]
        cumulative_correct += day_stats["correct"]
        completion_trend.append({
            "date": date_str,
            "attempted": day_stats["attempted"],
            "correct": day_stats["correct"],
            "cumulative_attempted": cumulative_attempted,
            "cumulative_correct": cumulative_correct,
            "accuracy_percentage": _percentage(cumulative_correct, cumulative_attempted)
        })

    weak_areas = sorted(
        [topic for topic in topic_breakdown if topic["attempted"] > 0],
        key=lambda topic: (topic["accuracy_percentage"], -topic["attempted"]),
    )[:3]

    return {
        "module_id": str(module.module_id),
        "module_title": module.title,
        "year": module.year,
        "total_units": len(_group_module_lessons(module)),
        "total_topics": len(topics),
        "total_questions": total_questions,
        "attempted_count": attempted_count,
        "correct_count": correct_count,
        "bookmarked_count": len(bookmarked_question_ids),
        "accuracy_percentage": _percentage(correct_count, attempted_count),
        "question_completion_percentage": _percentage(attempted_count, total_questions),
        "topic_breakdown": topic_breakdown,
        "difficulty_breakdown": difficulty_breakdown,
        "bloom_breakdown": bloom_breakdown,
        "outcome_breakdown": outcome_breakdown,
        "concept_breakdown": concept_breakdown,
        "completion_trend": completion_trend,
        "weak_areas": weak_areas,
    }


@router.get("/module/{module_id}")
async def get_quizzes_by_module(
    module_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    cache_key = f"quiz:module:{module_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    module = module_service.get_module_or_404(db, module_id, user=current_user)
    quizzes = db.query(Quiz).options(
        joinedload(Quiz.questions).joinedload(Question.options)
    ).filter(Quiz.module_id == module.module_id).all()
    
    serialized = [_serialize_quiz_for_student(q) for q in quizzes]
    await cache_set(cache_key, serialized, ttl=1800)  # cache for 30 minutes
    return serialized


@router.get("/module/{module_id}/study-bank")
async def get_module_study_bank(
    module_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Return unit-wise MCQ content for study mode inside the module section."""
    module = module_service.get_module_or_404(db, module_id, user=current_user)
    quizzes = (
        db.query(Quiz)
        .options(
            joinedload(Quiz.lesson),
            joinedload(Quiz.questions).joinedload(Question.options),
        )
        .filter(Quiz.module_id == module.module_id)
        .all()
    )
    question_ids = [
        question.question_id
        for quiz in quizzes
        for question in quiz.questions
    ]

    attempts_by_question_id: dict[str, QuestionAttempt] = {}
    bookmarked_question_ids: set[str] = set()
    if question_ids:
        attempts = (
            db.query(QuestionAttempt)
            .filter(
                QuestionAttempt.user_id == current_user.user_id,
                QuestionAttempt.question_id.in_(question_ids),
            )
            .all()
        )
        attempts_by_question_id = {str(attempt.question_id): attempt for attempt in attempts}

        bookmarks = (
            db.query(QuestionBookmark)
            .filter(
                QuestionBookmark.user_id == current_user.user_id,
                QuestionBookmark.question_id.in_(question_ids),
            )
            .all()
        )
        bookmarked_question_ids = {str(bookmark.question_id) for bookmark in bookmarks}

    return _serialize_module_study_bank(
        module,
        quizzes,
        attempts_by_question_id=attempts_by_question_id,
        bookmarked_question_ids=bookmarked_question_ids,
    )


@router.get("/module/{module_id}/analytics")
async def get_module_analytics(
    module_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    module = module_service.get_module_or_404(db, module_id, user=current_user)
    quizzes = (
        db.query(Quiz)
        .options(
            joinedload(Quiz.lesson),
            joinedload(Quiz.questions).joinedload(Question.options),
        )
        .filter(Quiz.module_id == module.module_id)
        .all()
    )
    question_ids = [
        question.question_id
        for quiz in quizzes
        for question in quiz.questions
    ]

    attempts_by_question_id: dict[str, QuestionAttempt] = {}
    bookmarked_question_ids: set[str] = set()
    if question_ids:
        attempts = (
            db.query(QuestionAttempt)
            .filter(
                QuestionAttempt.user_id == current_user.user_id,
                QuestionAttempt.question_id.in_(question_ids),
            )
            .all()
        )
        attempts_by_question_id = {str(attempt.question_id): attempt for attempt in attempts}

        bookmarks = (
            db.query(QuestionBookmark)
            .filter(
                QuestionBookmark.user_id == current_user.user_id,
                QuestionBookmark.question_id.in_(question_ids),
            )
            .all()
        )
        bookmarked_question_ids = {str(bookmark.question_id) for bookmark in bookmarks}

    return _build_module_analytics(
        module,
        quizzes,
        attempts_by_question_id=attempts_by_question_id,
        bookmarked_question_ids=bookmarked_question_ids,
    )


@router.get("/lesson/{lesson_id}")
async def get_quiz_by_lesson(
    lesson_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Get the quiz for a specific topic/lesson."""
    cache_key = f"quiz:lesson:{lesson_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    lesson = module_service.get_lesson_or_404(db, lesson_id, user=current_user)
    
    quiz = db.query(Quiz).options(
        joinedload(Quiz.questions).joinedload(Question.options)
    ).filter(Quiz.lesson_id == lesson_id).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this lesson")
    
    serialized = _serialize_quiz_for_student(quiz, randomize=True)
    await cache_set(cache_key, serialized, ttl=1800)  # cache for 30 minutes
    return serialized


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token)
):
    """Submit quiz answers. Returns score + per-question feedback with explanations."""
    answers = payload.get("answers", {})
    
    quiz = db.query(Quiz).options(
        joinedload(Quiz.lesson),
        joinedload(Quiz.questions).joinedload(Question.options)
    ).filter(Quiz.quiz_id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    module_service.get_module_or_404(db, quiz.module_id, user=current_user)
        
    correct_count = 0
    total_questions = len(quiz.questions)
    feedback = []
    
    for qs in quiz.questions:
        user_answer_id = answers.get(str(qs.question_id))
        correct_option = next((o for o in qs.options if o.is_correct), None)
        user_option = None
        is_correct = False
        
        if user_answer_id:
            user_option = next((o for o in qs.options if str(o.option_id) == str(user_answer_id)), None)
            if user_option and user_option.is_correct:
                is_correct = True
                correct_count += 1
            
            # Save QuestionAttempt record in database
            if user_option:
                q_attempt = (
                    db.query(QuestionAttempt)
                    .filter(
                        QuestionAttempt.user_id == current_user.user_id,
                        QuestionAttempt.question_id == qs.question_id,
                    )
                    .first()
                )
                if q_attempt:
                    q_attempt.selected_option_id = user_option.option_id
                    q_attempt.is_correct = user_option.is_correct
                    q_attempt.mode = "exam"
                    q_attempt.attempted_at = datetime.now(timezone.utc)
                else:
                    q_attempt = QuestionAttempt(
                        user_id=current_user.user_id,
                        question_id=qs.question_id,
                        selected_option_id=user_option.option_id,
                        is_correct=user_option.is_correct,
                        mode="exam",
                        attempted_at=datetime.now(timezone.utc),
                    )
                    db.add(q_attempt)
        
        topic_title = quiz.lesson.title if quiz.lesson else quiz.title
        difficulty_level = qs.difficulty_level or "Medium"
        placement_relevance = qs.placement_relevance or "Core placement readiness"
        blooms_level = _infer_blooms_level(qs.text, qs.order or 1)
        course_outcome = _infer_course_outcome(topic_title, placement_relevance)
        concepts_tested = _extract_concepts(topic_title, qs.text)
        recruiter_focus = _build_recruiter_focus(
            topic_title=topic_title,
            placement_relevance=placement_relevance,
            difficulty_level=difficulty_level,
        )
        
        feedback.append({
            "question_id": str(qs.question_id),
            "question_text": qs.text,
            "user_answer_id": str(user_answer_id) if user_answer_id else None,
            "user_answer_text": user_option.text if user_option else None,
            "correct_option_id": str(correct_option.option_id) if correct_option else None,
            "correct_option_text": correct_option.text if correct_option else None,
            "explanation": correct_option.explanation if correct_option else None,
            "is_correct": is_correct,
            "difficulty_level": difficulty_level,
            "blooms_level": blooms_level,
            "course_outcome": course_outcome,
            "placement_relevance": placement_relevance,
            "concepts_tested": concepts_tested,
            "recruiter_focus": recruiter_focus,
        })
                
    score_percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0
    passed = score_percentage >= 70
    
    attempt = QuizAttempt(
        user_id=current_user.user_id,
        quiz_id=quiz_id,
        score=int(score_percentage),
        passed=passed,
        answers=answers
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Automatically synchronize this attempt's completion and score to UserProgress
    if quiz.lesson_id:
        try:
            progress_service.mark_lesson_complete(
                db=db,
                user=current_user,
                lesson_id=quiz.lesson_id,
                score=int(score_percentage),
            )
        except Exception:
            pass
    
    return {
        "score": attempt.score,
        "passed": attempt.passed,
        "correct_answers": correct_count,
        "total": total_questions,
        "feedback": feedback,
    }


@router.post("/question/{question_id}/attempt")
async def submit_question_attempt(
    question_id: uuid.UUID,
    payload: QuestionAttemptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    question = (
        db.query(Question)
        .options(joinedload(Question.options), joinedload(Question.quiz))
        .filter(Question.question_id == question_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    module_service.get_module_or_404(db, question.quiz.module_id, user=current_user)

    selected_option = next(
        (option for option in question.options if option.option_id == payload.selected_option_id),
        None,
    )
    if not selected_option:
        raise HTTPException(status_code=400, detail="Selected option is invalid for this question")

    attempt = (
        db.query(QuestionAttempt)
        .filter(
            QuestionAttempt.user_id == current_user.user_id,
            QuestionAttempt.question_id == question.question_id,
        )
        .first()
    )

    normalized_mode = payload.mode.strip().lower() or "learning"
    if attempt:
        attempt.selected_option_id = selected_option.option_id
        attempt.is_correct = selected_option.is_correct
        attempt.mode = normalized_mode
        attempt.time_spent_seconds = payload.time_spent_seconds
        attempt.attempted_at = datetime.now(timezone.utc)
    else:
        attempt = QuestionAttempt(
            user_id=current_user.user_id,
            question_id=question.question_id,
            selected_option_id=selected_option.option_id,
            is_correct=selected_option.is_correct,
            mode=normalized_mode,
            time_spent_seconds=payload.time_spent_seconds,
        )
        db.add(attempt)

    db.commit()
    db.refresh(attempt)

    correct_option = next((option for option in question.options if option.is_correct), None)
    return {
        "question_id": str(question.question_id),
        "selected_option_id": str(selected_option.option_id),
        "selected_option_text": selected_option.text,
        "correct_option_id": str(correct_option.option_id) if correct_option else None,
        "correct_option_text": correct_option.text if correct_option else None,
        "is_correct": attempt.is_correct,
        "mode": attempt.mode,
        "time_spent_seconds": attempt.time_spent_seconds,
        "attempted_at": attempt.attempted_at.isoformat() if attempt.attempted_at else None,
    }


@router.post("/question/{question_id}/bookmark")
async def toggle_question_bookmark(
    question_id: uuid.UUID,
    payload: QuestionBookmarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    question = (
        db.query(Question)
        .options(joinedload(Question.quiz))
        .filter(Question.question_id == question_id)
        .first()
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    module_service.get_module_or_404(db, question.quiz.module_id, user=current_user)

    bookmark = (
        db.query(QuestionBookmark)
        .filter(
            QuestionBookmark.user_id == current_user.user_id,
            QuestionBookmark.question_id == question.question_id,
        )
        .first()
    )

    if payload.is_bookmarked:
        if not bookmark:
            bookmark = QuestionBookmark(
                user_id=current_user.user_id,
                question_id=question.question_id,
            )
            db.add(bookmark)
            db.commit()
            db.refresh(bookmark)
        return {
            "question_id": str(question.question_id),
            "is_bookmarked": True,
            "created_at": bookmark.created_at.isoformat() if bookmark.created_at else None,
        }

    if bookmark:
        db.delete(bookmark)
        db.commit()

    return {
        "question_id": str(question.question_id),
        "is_bookmarked": False,
        "created_at": None,
    }
