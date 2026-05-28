def test_admin_can_create_learning_content_and_student_can_complete_it(
    client,
    create_user,
    auth_headers,
):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(role_name="student", email="student@example.com", year=1)

    admin_headers = auth_headers(admin_user.email, admin_password)
    student_headers = auth_headers(student_user.email, student_password)

    module_response = client.post(
        "/api/v1/modules",
        headers=admin_headers,
        json={
            "title": "Professional Communication",
            "description": "Write clearly and confidently.",
            "year": 1,
            "order": 1,
            "is_premium": False,
        },
    )
    assert module_response.status_code == 201
    module_payload = module_response.json()
    assert module_payload["title"] == "Professional Communication"
    assert module_payload["year"] == 1
    assert module_payload["lesson_count"] == 0

    lesson_response = client.post(
        "/api/v1/lessons",
        headers=admin_headers,
        json={
            "module_id": module_payload["module_id"],
            "title": "Email Basics",
            "content": "Keep it concise and respectful.",
            "order": 1,
        },
    )
    assert lesson_response.status_code == 201
    lesson_payload = lesson_response.json()
    assert lesson_payload["module_id"] == module_payload["module_id"]

    list_modules_response = client.get("/api/v1/modules", headers=student_headers)
    assert list_modules_response.status_code == 200
    modules_payload = list_modules_response.json()
    assert modules_payload[0]["lesson_count"] == 1

    completion_response = client.post(
        f"/api/v1/lessons/{lesson_payload['lesson_id']}/complete",
        headers=student_headers,
    )
    assert completion_response.status_code == 200
    assert completion_response.json()["progress"]["is_completed"] is True

    stats_response = client.get("/api/v1/my/stats", headers=student_headers)
    assert stats_response.status_code == 200
    stats_payload = stats_response.json()
    assert stats_payload["completed_lessons"] == 1
    assert stats_payload["total_lessons"] == 1
    assert stats_payload["completion_percentage"] == 100.0
    assert stats_payload["current_streak"] == 1


def test_module_contract_and_permissions_are_enforced(client, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(role_name="student", email="student@example.com")

    admin_response = client.post(
        "/api/v1/modules",
        headers=auth_headers(admin_user.email, admin_password),
        json={
            "title": "Contracts",
            "description": "Locked schema",
            "year": 1,
            "order": 1,
            "is_premium": False,
            "unexpected": "value",
        },
    )
    assert admin_response.status_code == 422
    admin_payload = admin_response.json()
    assert admin_payload["error"]["code"] == "validation_error"
    assert any(item["field"] == "body.unexpected" for item in admin_payload["error"]["details"])

    student_response = client.post(
        "/api/v1/modules",
        headers=auth_headers(student_user.email, student_password),
        json={
            "title": "Unauthorized",
            "description": "Students cannot create modules",
            "year": 1,
            "order": 1,
            "is_premium": False,
        },
    )
    assert student_response.status_code == 403
    student_payload = student_response.json()
    assert student_payload["error"]["code"] == "forbidden"
    assert "not authorized" in student_payload["error"]["message"]


def test_module_not_found_uses_standard_error_contract(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@example.com",
            "password": "securepass123",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "year": 1,
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "securepass123"},
    )
    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/modules/00000000-0000-0000-0000-000000000001",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    payload = response.json()
    assert payload["error"]["code"] == "not_found"
    assert payload["error"]["message"] == "Module not found"


def test_students_only_see_and_open_their_own_year_modules(client, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(
        role_name="student",
        email="student@example.com",
        year=2,
    )

    admin_headers = auth_headers(admin_user.email, admin_password)
    student_headers = auth_headers(student_user.email, student_password)

    year_one_module = client.post(
        "/api/v1/modules",
        headers=admin_headers,
        json={
            "title": "Year One Module",
            "description": "Only for first year students",
            "year": 1,
            "order": 1,
            "is_premium": False,
        },
    )
    assert year_one_module.status_code == 201

    year_two_module = client.post(
        "/api/v1/modules",
        headers=admin_headers,
        json={
            "title": "Year Two Module",
            "description": "Only for second year students",
            "year": 2,
            "order": 2,
            "is_premium": False,
        },
    )
    assert year_two_module.status_code == 201

    locked_lesson = client.post(
        "/api/v1/lessons",
        headers=admin_headers,
        json={
            "module_id": year_one_module.json()["module_id"],
            "title": "Locked Lesson",
            "content": "Restricted lesson",
            "order": 1,
        },
    )
    assert locked_lesson.status_code == 201

    visible_modules_response = client.get("/api/v1/modules", headers=student_headers)
    assert visible_modules_response.status_code == 200
    visible_titles = [module["title"] for module in visible_modules_response.json()]
    assert visible_titles == ["Year Two Module"]

    forbidden_module_response = client.get(
        f"/api/v1/modules/{year_one_module.json()['module_id']}",
        headers=student_headers,
    )
    assert forbidden_module_response.status_code == 403
    assert forbidden_module_response.json()["error"]["message"] == "You can only access modules assigned to your year"

    forbidden_completion_response = client.post(
        f"/api/v1/lessons/{locked_lesson.json()['lesson_id']}/complete",
        headers=student_headers,
    )
    assert forbidden_completion_response.status_code == 403
    assert forbidden_completion_response.json()["error"]["message"] == "You can only access modules assigned to your year"
