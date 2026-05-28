import uuid

from app.models.module import Lesson, Module
from app.models.quiz import Option, Question, Quiz
from seed_course1 import COURSE, seed as seed_year_one_course


def _create_module_with_unit_quiz(
    db_session,
    *,
    year: int,
    module_title: str,
    topic_title: str,
    difficulty_level: str = "Medium",
    placement_relevance: str = "Interview clarity and placement readiness",
):
    module = Module(
        module_id=uuid.uuid4(),
        title=module_title,
        description=f"{module_title} description",
        year=year,
        order=year,
        is_premium=False,
    )
    db_session.add(module)
    db_session.flush()

    unit = Lesson(
        lesson_id=uuid.uuid4(),
        module_id=module.module_id,
        title="Unit 1: Foundations",
        content="Unit content",
        order=1,
    )
    topic = Lesson(
        lesson_id=uuid.uuid4(),
        module_id=module.module_id,
        title=f"  → {topic_title}",
        content="Topic content",
        order=11,
    )
    db_session.add_all([unit, topic])
    db_session.flush()

    quiz = Quiz(
        quiz_id=uuid.uuid4(),
        module_id=module.module_id,
        lesson_id=topic.lesson_id,
        title=f"Quiz: {topic_title}",
        description="Topic quiz",
    )
    db_session.add(quiz)
    db_session.flush()

    question = Question(
        question_id=uuid.uuid4(),
        quiz_id=quiz.quiz_id,
        text="What makes an answer recruiter-friendly?",
        order=1,
        difficulty_level=difficulty_level,
        placement_relevance=placement_relevance,
    )
    db_session.add(question)
    db_session.flush()

    db_session.add_all(
        [
            Option(
                option_id=uuid.uuid4(),
                question_id=question.question_id,
                text="Clear structure and professional reasoning",
                is_correct=True,
                explanation="Recruiters value answers that are structured, relevant, and professionally framed.",
            ),
            Option(
                option_id=uuid.uuid4(),
                question_id=question.question_id,
                text="Using difficult words without clarity",
                is_correct=False,
                explanation=None,
            ),
            Option(
                option_id=uuid.uuid4(),
                question_id=question.question_id,
                text="Avoiding examples completely",
                is_correct=False,
                explanation=None,
            ),
            Option(
                option_id=uuid.uuid4(),
                question_id=question.question_id,
                text="Speaking in unrelated points",
                is_correct=False,
                explanation=None,
            ),
        ]
    )
    db_session.commit()
    return module, topic


def test_module_study_bank_returns_unit_wise_mcqs_with_metadata(
    client,
    db_session,
    create_user,
    auth_headers,
):
    student_user, student_password = create_user(
        role_name="student",
        email="student@example.com",
        year=2,
    )
    module, _topic = _create_module_with_unit_quiz(
        db_session,
        year=2,
        module_title="Year Two Placement Communication",
        topic_title="Professional Email Writing",
        difficulty_level="Medium",
        placement_relevance="Email etiquette during recruiter and hiring-manager conversations",
    )

    response = client.get(
        f"/api/v1/quiz/module/{module.module_id}/study-bank",
        headers=auth_headers(student_user.email, student_password),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["module_title"] == "Year Two Placement Communication"
    assert payload["year"] == 2
    assert len(payload["units"]) == 1

    unit = payload["units"][0]
    assert unit["title"] == "Unit 1: Foundations"
    assert unit["topic_count"] == 1
    assert unit["question_count"] == 1

    topic = unit["topics"][0]
    assert topic["title"] == "Professional Email Writing"
    assert topic["question_count"] == 1

    question = topic["questions"][0]
    assert question["difficulty_level"] == "Medium"
    assert question["placement_relevance"] == "Email etiquette during recruiter and hiring-manager conversations"
    assert "Recruiters use questions like this" in question["recruiter_focus"]
    assert question["correct_option_text"] == "Clear structure and professional reasoning"
    assert question["explanation"] == "Recruiters value answers that are structured, relevant, and professionally framed."
    assert len(question["options"]) == 4


def test_students_cannot_open_other_year_lesson_quizzes_or_study_banks(
    client,
    db_session,
    create_user,
    auth_headers,
):
    student_user, student_password = create_user(
        role_name="student",
        email="student@example.com",
        year=2,
    )
    year_one_module, year_one_topic = _create_module_with_unit_quiz(
        db_session,
        year=1,
        module_title="Year One Basics",
        topic_title="Foundation Topic",
        difficulty_level="Easy",
    )
    year_two_module, _year_two_topic = _create_module_with_unit_quiz(
        db_session,
        year=2,
        module_title="Year Two Basics",
        topic_title="Placement Topic",
        difficulty_level="Hard",
    )

    lesson_response = client.get(
        f"/api/v1/quiz/lesson/{year_one_topic.lesson_id}",
        headers=auth_headers(student_user.email, student_password),
    )
    assert lesson_response.status_code == 403
    assert lesson_response.json()["error"]["message"] == "You can only access modules assigned to your year"

    study_bank_response = client.get(
        f"/api/v1/quiz/module/{year_one_module.module_id}/study-bank",
        headers=auth_headers(student_user.email, student_password),
    )
    assert study_bank_response.status_code == 403
    assert study_bank_response.json()["error"]["message"] == "You can only access modules assigned to your year"

    allowed_response = client.get(
        f"/api/v1/quiz/module/{year_two_module.module_id}/study-bank",
        headers=auth_headers(student_user.email, student_password),
    )
    assert allowed_response.status_code == 200


def test_year_one_seed_creates_module_section_with_quizzes(db_session):
    created = seed_year_one_course(db_session, apply_migrations=False)
    assert created is True

    seeded_module = db_session.query(Module).filter(Module.title == COURSE["title"]).first()
    assert seeded_module is not None
    assert seeded_module.year == 1
    assert len(seeded_module.lessons) > 0
    assert len(seeded_module.quizzes) > 0

    first_quiz = seeded_module.quizzes[0]
    assert first_quiz.lesson_id is not None
    assert len(first_quiz.questions) > 0
    assert len(first_quiz.questions[0].options) == 4


def test_question_attempts_and_bookmarks_are_persisted_in_study_bank(
    client,
    db_session,
    create_user,
    auth_headers,
):
    student_user, student_password = create_user(
        role_name="student",
        email="student@example.com",
        year=2,
    )
    module, _topic = _create_module_with_unit_quiz(
        db_session,
        year=2,
        module_title="Year Two Persistent Practice",
        topic_title="Persistent Topic",
    )
    quiz = db_session.query(Quiz).filter(Quiz.module_id == module.module_id).first()
    question = quiz.questions[0]
    correct_option = next(option for option in question.options if option.is_correct)

    headers = auth_headers(student_user.email, student_password)

    attempt_response = client.post(
        f"/api/v1/quiz/question/{question.question_id}/attempt",
        headers=headers,
        json={
            "selected_option_id": str(correct_option.option_id),
            "mode": "learning",
            "time_spent_seconds": 24,
        },
    )
    assert attempt_response.status_code == 200
    attempt_payload = attempt_response.json()
    assert attempt_payload["is_correct"] is True
    assert attempt_payload["selected_option_id"] == str(correct_option.option_id)

    bookmark_response = client.post(
        f"/api/v1/quiz/question/{question.question_id}/bookmark",
        headers=headers,
        json={"is_bookmarked": True},
    )
    assert bookmark_response.status_code == 200
    assert bookmark_response.json()["is_bookmarked"] is True

    study_bank_response = client.get(
        f"/api/v1/quiz/module/{module.module_id}/study-bank",
        headers=headers,
    )
    assert study_bank_response.status_code == 200
    persisted_question = study_bank_response.json()["units"][0]["topics"][0]["questions"][0]
    assert persisted_question["is_bookmarked"] is True
    assert persisted_question["attempt_state"]["is_correct"] is True
    assert persisted_question["attempt_state"]["selected_option_id"] == str(correct_option.option_id)
    assert persisted_question["attempt_state"]["time_spent_seconds"] == 24


def test_module_analytics_summarizes_attempts_and_bookmarks(
    client,
    db_session,
    create_user,
    auth_headers,
):
    student_user, student_password = create_user(
        role_name="student",
        email="analytics-student@example.com",
        year=2,
    )
    module, _topic = _create_module_with_unit_quiz(
        db_session,
        year=2,
        module_title="Year Two Analytics Practice",
        topic_title="Analytics Topic",
        difficulty_level="Hard",
    )
    quiz = db_session.query(Quiz).filter(Quiz.module_id == module.module_id).first()
    question = quiz.questions[0]
    correct_option = next(option for option in question.options if option.is_correct)
    headers = auth_headers(student_user.email, student_password)

    attempt_response = client.post(
        f"/api/v1/quiz/question/{question.question_id}/attempt",
        headers=headers,
        json={
            "selected_option_id": str(correct_option.option_id),
            "mode": "revision",
        },
    )
    assert attempt_response.status_code == 200

    bookmark_response = client.post(
        f"/api/v1/quiz/question/{question.question_id}/bookmark",
        headers=headers,
        json={"is_bookmarked": True},
    )
    assert bookmark_response.status_code == 200

    response = client.get(
        f"/api/v1/quiz/module/{module.module_id}/analytics",
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["module_title"] == "Year Two Analytics Practice"
    assert payload["total_units"] == 1
    assert payload["total_topics"] == 1
    assert payload["total_questions"] == 1
    assert payload["attempted_count"] == 1
    assert payload["correct_count"] == 1
    assert payload["bookmarked_count"] == 1
    assert payload["accuracy_percentage"] == 100
    assert payload["question_completion_percentage"] == 100
    assert payload["difficulty_breakdown"]["Hard"]["attempted"] == 1
    assert payload["topic_breakdown"][0]["accuracy_percentage"] == 100
    
    assert "concept_breakdown" in payload
    assert "completion_trend" in payload
    assert len(payload["completion_trend"]) > 0
    assert payload["completion_trend"][0]["attempted"] == 1
    assert payload["completion_trend"][0]["correct"] == 1
