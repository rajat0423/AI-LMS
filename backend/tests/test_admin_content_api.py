import uuid

from app.models.module import Lesson, Module
from app.models.quiz import Option, Question, Quiz


def _create_module_topic(db_session):
    module = Module(
        module_id=uuid.uuid4(),
        title="Admin Editable Module",
        description="Editable content",
        year=1,
        order=1,
        is_premium=False,
    )
    db_session.add(module)
    db_session.flush()

    lesson = Lesson(
        lesson_id=uuid.uuid4(),
        module_id=module.module_id,
        title="Interview Topic",
        content="Topic content",
        order=1,
    )
    db_session.add(lesson)
    db_session.commit()
    return module, lesson


def _question_payload(**overrides):
    payload = {
        "text": "Which response is most recruiter-friendly?",
        "order": 1,
        "difficulty_level": "Medium",
        "placement_relevance": "Interview clarity",
        "explanation": "Clear, structured answers help recruiters evaluate fit.",
        "options": [
            {"text": "Clear structure with relevant examples", "is_correct": True},
            {"text": "Long answers without a point", "is_correct": False},
            {"text": "Avoiding examples", "is_correct": False},
            {"text": "Unrelated personal details", "is_correct": False},
        ],
    }
    payload.update(overrides)
    return payload


def test_admin_can_load_full_module_editor_payload(client, db_session, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    module, lesson = _create_module_topic(db_session)
    quiz = Quiz(module_id=module.module_id, lesson_id=lesson.lesson_id, title="Topic quiz")
    db_session.add(quiz)
    db_session.flush()
    question = Question(
        quiz_id=quiz.quiz_id,
        text="Question text",
        order=1,
        difficulty_level="Easy",
        placement_relevance="Core readiness",
    )
    db_session.add(question)
    db_session.flush()
    db_session.add_all(
        [
            Option(question_id=question.question_id, text="Correct", is_correct=True, explanation="Because it is correct"),
            Option(question_id=question.question_id, text="Wrong", is_correct=False),
        ]
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/admin/content/modules/{module.module_id}/editor",
        headers=auth_headers(admin_user.email, admin_password),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["module"]["module_id"] == str(module.module_id)
    assert payload["lessons"][0]["lesson_id"] == str(lesson.lesson_id)
    assert payload["lessons"][0]["quiz"]["question_count"] == 1
    assert payload["lessons"][0]["quiz"]["questions"][0]["options"][0]["is_correct"] in {True, False}


def test_student_cannot_access_admin_content_endpoints(client, db_session, create_user, auth_headers):
    student_user, student_password = create_user(role_name="student", email="student@example.com")
    module, _lesson = _create_module_topic(db_session)

    response = client.get(
        f"/api/v1/admin/content/modules/{module.module_id}/editor",
        headers=auth_headers(student_user.email, student_password),
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_admin_can_create_update_and_delete_question(client, db_session, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    _module, lesson = _create_module_topic(db_session)
    headers = auth_headers(admin_user.email, admin_password)

    quiz_response = client.post(
        f"/api/v1/admin/content/lessons/{lesson.lesson_id}/quiz",
        headers=headers,
        json={"title": "Interview Topic Quiz", "description": "Structured MCQs"},
    )
    assert quiz_response.status_code == 201
    quiz_id = quiz_response.json()["quiz_id"]

    create_response = client.post(
        f"/api/v1/admin/content/quizzes/{quiz_id}/questions",
        headers=headers,
        json=_question_payload(),
    )
    assert create_response.status_code == 201
    question_payload = create_response.json()
    assert question_payload["text"] == "Which response is most recruiter-friendly?"
    assert len(question_payload["options"]) == 4
    assert sum(1 for option in question_payload["options"] if option["is_correct"]) == 1
    assert question_payload["explanation"] == "Clear, structured answers help recruiters evaluate fit."

    update_response = client.put(
        f"/api/v1/admin/content/questions/{question_payload['question_id']}",
        headers=headers,
        json=_question_payload(
            text="What makes an answer professional?",
            difficulty_level="Hard",
            options=[
                {"text": "Specific examples and concise reasoning", "is_correct": True},
                {"text": "Generic phrases", "is_correct": False},
            ],
        ),
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["text"] == "What makes an answer professional?"
    assert updated["difficulty_level"] == "Hard"
    assert len(updated["options"]) == 2

    delete_response = client.delete(
        f"/api/v1/admin/content/questions/{updated['question_id']}",
        headers=headers,
    )
    assert delete_response.status_code == 204

    editor_response = client.get(
        f"/api/v1/admin/content/modules/{lesson.module_id}/editor",
        headers=headers,
    )
    assert editor_response.status_code == 200
    assert editor_response.json()["lessons"][0]["quiz"]["question_count"] == 0


def test_admin_question_validation(client, db_session, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    _module, lesson = _create_module_topic(db_session)
    headers = auth_headers(admin_user.email, admin_password)
    quiz_response = client.post(
        f"/api/v1/admin/content/lessons/{lesson.lesson_id}/quiz",
        headers=headers,
        json={},
    )
    quiz_id = quiz_response.json()["quiz_id"]

    invalid_payloads = [
        _question_payload(options=[{"text": "Only one", "is_correct": True}]),
        _question_payload(options=[{"text": "A", "is_correct": False}, {"text": "B", "is_correct": False}]),
        _question_payload(options=[{"text": "A", "is_correct": True}, {"text": "B", "is_correct": True}]),
        _question_payload(text=" "),
    ]

    for payload in invalid_payloads:
        response = client.post(
            f"/api/v1/admin/content/quizzes/{quiz_id}/questions",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 422


def test_student_quiz_payload_still_masks_correctness(client, db_session, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(
        role_name="student",
        email="student@example.com",
        year=1,
    )
    _module, lesson = _create_module_topic(db_session)
    admin_headers = auth_headers(admin_user.email, admin_password)

    quiz_response = client.post(
        f"/api/v1/admin/content/lessons/{lesson.lesson_id}/quiz",
        headers=admin_headers,
        json={},
    )
    question_response = client.post(
        f"/api/v1/admin/content/quizzes/{quiz_response.json()['quiz_id']}/questions",
        headers=admin_headers,
        json=_question_payload(),
    )
    assert question_response.status_code == 201

    student_response = client.get(
        f"/api/v1/quiz/lesson/{lesson.lesson_id}",
        headers=auth_headers(student_user.email, student_password),
    )

    assert student_response.status_code == 200
    question = student_response.json()["questions"][0]
    assert "correct_option_id" not in question
    assert "is_correct" not in question["options"][0]
