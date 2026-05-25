from sqlalchemy import Column, String, ForeignKey, Boolean, Integer, JSON, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime, timezone

def generate_uuid():
    return str(uuid.uuid4())

class Quiz(Base):
    __tablename__ = "quizzes"
    quiz_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.module_id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.lesson_id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(String)
    
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")
    module = relationship("Module", back_populates="quizzes")
    lesson = relationship("Lesson", backref="quizzes", foreign_keys=[lesson_id])

class Question(Base):
    __tablename__ = "questions"
    question_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    order = Column(Integer, default=1)
    difficulty_level = Column(String(50), nullable=False, default="Medium")
    placement_relevance = Column(String(255), nullable=False, default="Core placement readiness")
    
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan")
    quiz = relationship("Quiz", back_populates="questions")

class Option(Base):
    __tablename__ = "options"
    option_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    is_correct = Column(Boolean, default=False)
    explanation = Column(String, nullable=True)  # Shown after submit for correct option
    
    question = relationship("Question", back_populates="options")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    attempt_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.quiz_id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, default=False)
    answers = Column(JSON) # User's answers mapped by question_id
    created_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class QuestionAttempt(Base):
    __tablename__ = "question_attempts"

    question_attempt_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
    selected_option_id = Column(UUID(as_uuid=True), ForeignKey("options.option_id", ondelete="CASCADE"), nullable=False)
    is_correct = Column(Boolean, default=False, nullable=False)
    mode = Column(String(20), nullable=False, default="learning")
    time_spent_seconds = Column(Integer, nullable=True)
    attempted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_question_attempt_user_question"),)

    question = relationship("Question")
    selected_option = relationship("Option")


class QuestionBookmark(Base):
    __tablename__ = "question_bookmarks"

    question_bookmark_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_question_bookmark_user_question"),)

    question = relationship("Question")
