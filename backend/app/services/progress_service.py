from dataclasses import dataclass
from datetime import timedelta
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.time import utc_now
from app.models.module import Lesson, Module
from app.models.progress import UserProgress
from app.models.streak import Streak
from app.models.user import User
from app.schemas.progress import ProgressItemResponse


@dataclass
class LearningStats:
    total_modules: int
    completed_modules: int
    total_lessons: int
    completed_lessons: int
    completion_percentage: float
    current_streak: int
    longest_streak: int
    resume_score: int
    avg_accuracy: int
    confidence_score: int
    has_taken_interview: bool


def _update_streak(db: Session, user_id: uuid.UUID) -> Streak:
    today = utc_now().date()
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()

    if not streak:
        streak = Streak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today,
        )
        db.add(streak)
        return streak

    if streak.last_activity_date == today:
        return streak

    if streak.last_activity_date == today - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_activity_date = today
    return streak


def _serialize_progress(progress: UserProgress) -> ProgressItemResponse:
    lesson = progress.lesson
    module = lesson.module
    return ProgressItemResponse(
        progress_id=progress.progress_id,
        lesson_id=lesson.lesson_id,
        lesson_title=lesson.title,
        module_id=module.module_id,
        module_title=module.title,
        is_completed=progress.is_completed,
        completed_at=progress.completed_at,
        score=progress.score,
        updated_at=progress.updated_at,
    )


def _is_accessible_to_student(user: User, module: Module) -> bool:
    if user.role_name != "student":
        return True
    return module.year == user.year


def mark_lesson_complete(db: Session, user: User, lesson_id: uuid.UUID, score: int | None = None) -> ProgressItemResponse:
    lesson = (
        db.query(Lesson)
        .options(selectinload(Lesson.module))
        .filter(Lesson.lesson_id == lesson_id)
        .first()
    )
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found",
        )

    # Automatically calculate score from user attempts if none was provided
    if score is None:
        from app.models.quiz import Quiz, Question, QuestionAttempt
        quiz = db.query(Quiz).filter(Quiz.lesson_id == lesson_id).first()
        if quiz and quiz.questions:
            total_questions = len(quiz.questions)
            question_ids = [q.question_id for q in quiz.questions]
            attempts = (
                db.query(QuestionAttempt)
                .filter(
                    QuestionAttempt.user_id == user.user_id,
                    QuestionAttempt.question_id.in_(question_ids)
                )
                .all()
            )
            correct_attempts = sum(1 for a in attempts if a.is_correct)
            if total_questions > 0:
                score = int((correct_attempts / total_questions) * 100)

    progress = (
        db.query(UserProgress)
        .options(selectinload(UserProgress.lesson).selectinload(Lesson.module))
        .filter(
            UserProgress.user_id == user.user_id,
            UserProgress.lesson_id == lesson_id,
        )
        .first()
    )

    was_completed = bool(progress and progress.is_completed)
    now = utc_now()

    if not progress:
        progress = UserProgress(
            user_id=user.user_id,
            lesson_id=lesson_id,
            is_completed=True,
            completed_at=now,
            score=score,
        )
        db.add(progress)
    else:
        progress.is_completed = True
        progress.completed_at = progress.completed_at or now
        progress.score = score

    if not was_completed:
        _update_streak(db, user.user_id)

    db.commit()
    db.refresh(progress)
    progress = (
        db.query(UserProgress)
        .options(selectinload(UserProgress.lesson).selectinload(Lesson.module))
        .filter(UserProgress.progress_id == progress.progress_id)
        .first()
    )
    return _serialize_progress(progress)


def get_user_progress(db: Session, user: User) -> list[ProgressItemResponse]:
    progress_items = (
        db.query(UserProgress)
        .options(selectinload(UserProgress.lesson).selectinload(Lesson.module))
        .filter(UserProgress.user_id == user.user_id)
        .order_by(UserProgress.updated_at.desc())
        .all()
    )
    return [
        _serialize_progress(item)
        for item in progress_items
        if item.lesson and item.lesson.module and _is_accessible_to_student(user, item.lesson.module)
    ]


def get_learning_stats(db: Session, user: User) -> LearningStats:
    completed_progress = (
        db.query(UserProgress)
        .options(selectinload(UserProgress.lesson).selectinload(Lesson.module))
        .filter(UserProgress.user_id == user.user_id, UserProgress.is_completed.is_(True))
        .all()
    )
    accessible_completed_progress = [
        item
        for item in completed_progress
        if item.lesson and item.lesson.module and _is_accessible_to_student(user, item.lesson.module)
    ]
    completed_lesson_ids = {item.lesson_id for item in accessible_completed_progress}
    completed_lessons = len(completed_lesson_ids)

    modules = (
        db.query(Module)
        .options(selectinload(Module.lessons))
        .order_by(Module.order.asc())
        .all()
    )
    if user.role_name == "student":
        modules = [module for module in modules if _is_accessible_to_student(user, module)]

    total_modules = len(modules)
    total_lessons = sum(len(module.lessons) for module in modules)
    completed_modules = 0
    for module in modules:
        module_lesson_ids = {lesson.lesson_id for lesson in module.lessons}
        if module_lesson_ids and module_lesson_ids.issubset(completed_lesson_ids):
            completed_modules += 1

    streak = db.query(Streak).filter(Streak.user_id == user.user_id).first()
    completion_percentage = round(
        (completed_lessons / total_lessons) * 100 if total_lessons else 0.0,
        2,
    )

    # ── 1. Calculate Real Average Accuracy ──
    progress_with_scores = [p for p in accessible_completed_progress if p.score is not None]
    if progress_with_scores:
        avg_accuracy = int(sum(p.score for p in progress_with_scores) / len(progress_with_scores))
    else:
        avg_accuracy = 0

    # ── 2. Calculate Real Confidence Score ──
    if completion_percentage > 0 or avg_accuracy > 0:
        confidence_score = int((completion_percentage * 0.4) + (avg_accuracy * 0.6))
        confidence_score = max(35, min(100, confidence_score))
    else:
        confidence_score = 0

    # ── 3. Calculate Real Resume ATS Match Score ──
    from app.models.career_analysis import ResumeAnalysis
    latest_analysis = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == user.user_id)
        .order_by(ResumeAnalysis.created_at.desc())
        .first()
    )
    resume_score = latest_analysis.match_percentage if latest_analysis and latest_analysis.match_percentage else 0

    # ── 4. Query InterviewSession for Taken State ──
    from app.models.interview import InterviewSession
    has_taken_interview = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.user_id)
        .first()
    ) is not None

    return LearningStats(
        total_modules=total_modules,
        completed_modules=completed_modules,
        total_lessons=total_lessons,
        completed_lessons=completed_lessons,
        completion_percentage=completion_percentage,
        current_streak=streak.current_streak if streak else 0,
        longest_streak=streak.longest_streak if streak else 0,
        resume_score=resume_score,
        avg_accuracy=avg_accuracy,
        confidence_score=confidence_score,
        has_taken_interview=has_taken_interview,
    )
