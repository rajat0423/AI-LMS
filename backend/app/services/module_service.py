import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.academic_years import normalize_year_value
from app.models.module import Lesson, Module
from app.models.user import User
from app.schemas.module import LessonCreate, LessonUpdate, ModuleCreate, ModuleUpdate


def _should_limit_to_student_year(user: User | None) -> bool:
    return bool(user and user.role_name == "student")

def _apply_module_access(query, user: User | None):
    if _should_limit_to_student_year(user):
        return query.filter(Module.year == normalize_year_value(user.year))
    return query

def ensure_module_access(user: User | None, module: Module) -> Module:
    if _should_limit_to_student_year(user) and module.year != normalize_year_value(user.year):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access modules assigned to your year",
        )
    return module


def list_modules(db: Session, user: User | None = None) -> list[Module]:
    query = (
        db.query(Module)
        .options(selectinload(Module.lessons))
        .order_by(Module.year.asc(), Module.order.asc(), Module.created_at.asc())
    )
    return _apply_module_access(query, user).all()


def get_module_or_404(db: Session, module_id: uuid.UUID, user: User | None = None) -> Module:
    module = (
        db.query(Module)
        .options(selectinload(Module.lessons))
        .filter(Module.module_id == module_id)
        .first()
    )
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found",
        )
    return ensure_module_access(user, module)


def create_module(db: Session, module_in: ModuleCreate) -> Module:
    module = Module(**module_in.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    return get_module_or_404(db, module.module_id)


def update_module(db: Session, module_id: uuid.UUID, module_in: ModuleUpdate) -> Module:
    module = get_module_or_404(db, module_id)
    for field, value in module_in.model_dump(exclude_unset=True).items():
        setattr(module, field, value)

    db.commit()
    db.refresh(module)
    return get_module_or_404(db, module.module_id)


def delete_module(db: Session, module_id: uuid.UUID) -> None:
    module = get_module_or_404(db, module_id)
    db.delete(module)
    db.commit()


def list_lessons_for_module(db: Session, module_id: uuid.UUID, user: User | None = None) -> list[Lesson]:
    module = get_module_or_404(db, module_id, user=user)
    return module.lessons


def get_lesson_or_404(db: Session, lesson_id: uuid.UUID, user: User | None = None) -> Lesson:
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
    ensure_module_access(user, lesson.module)
    return lesson


def create_lesson(db: Session, lesson_in: LessonCreate) -> Lesson:
    get_module_or_404(db, lesson_in.module_id)

    lesson = Lesson(**lesson_in.model_dump())
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return get_lesson_or_404(db, lesson.lesson_id)


def update_lesson(db: Session, lesson_id: uuid.UUID, lesson_in: LessonUpdate) -> Lesson:
    lesson = get_lesson_or_404(db, lesson_id)
    for field, value in lesson_in.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)
    return get_lesson_or_404(db, lesson.lesson_id)


def delete_lesson(db: Session, lesson_id: uuid.UUID) -> None:
    lesson = get_lesson_or_404(db, lesson_id)
    from app.models.quiz import Quiz

    db.query(Quiz).filter(Quiz.lesson_id == lesson.lesson_id).delete(synchronize_session=False)
    db.delete(lesson)
    db.commit()
