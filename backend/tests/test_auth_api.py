def test_register_login_and_me_flow(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@example.com",
            "password": "securepass123",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "year": 2,
        },
    )

    assert register_response.status_code == 201
    registered_user = register_response.json()
    assert registered_user["email"] == "student@example.com"
    assert registered_user["year"] == 2
    assert registered_user["role_name"] == "student"
    assert "password" not in registered_user

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "securepass123"},
    )

    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert login_payload["token_type"] == "bearer"
    assert login_payload["user"]["email"] == "student@example.com"
    assert login_payload["user"]["year"] == 2

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login_payload['access_token']}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["email"] == "student@example.com"
    assert me_response.json()["year"] == 2


def test_auth_contract_rejects_unknown_fields(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@example.com",
            "password": "securepass123",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "year": 3,
            "unexpected": "value",
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "validation_error"
    assert payload["error"]["message"] == "Request validation failed"
    assert any(item["field"] == "body.unexpected" for item in payload["error"]["details"])


def test_register_requires_academic_year_and_profile_can_update_it(client):
    missing_year_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@example.com",
            "password": "securepass123",
            "first_name": "Ada",
            "last_name": "Lovelace",
        },
    )

    assert missing_year_response.status_code == 422
    missing_year_payload = missing_year_response.json()
    assert missing_year_payload["error"]["code"] == "validation_error"
    assert any(item["field"] == "body.year" for item in missing_year_payload["error"]["details"])

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student2@example.com",
            "password": "securepass123",
            "first_name": "Grace",
            "last_name": "Hopper",
            "year": 1,
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "student2@example.com", "password": "securepass123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    profile_response = client.put(
        "/api/v1/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "first_name": "Grace",
            "last_name": "Hopper",
            "year": 4,
        },
    )

    assert profile_response.status_code == 200
    profile_payload = profile_response.json()
    assert profile_payload["first_name"] == "Grace"
    assert profile_payload["last_name"] == "Hopper"
    assert profile_payload["year"] == 4


def test_role_specific_auth_endpoints_return_expected_shape(client, create_user, auth_headers):
    admin_user, admin_password = create_user(role_name="admin", email="admin@example.com")
    student_user, student_password = create_user(role_name="student", email="student@example.com")

    admin_response = client.get(
        "/api/v1/auth/admin/dashboard",
        headers=auth_headers(admin_user.email, admin_password),
    )
    assert admin_response.status_code == 200
    admin_payload = admin_response.json()
    assert admin_payload["role"] == "admin"
    assert set(admin_payload["stats"]) == {"total_users", "total_modules", "total_lessons"}

    student_response = client.get(
        "/api/v1/auth/student/progress",
        headers=auth_headers(student_user.email, student_password),
    )
    assert student_response.status_code == 200
    student_payload = student_response.json()
    assert student_payload["completed_lessons"] == 0
    assert student_payload["total_lessons"] == 0
    assert student_payload["completion_percentage"] == 0.0


def test_auth_failures_use_standard_error_contract(client, create_user):
    user, _password = create_user(role_name="student", email="student@example.com")

    invalid_login = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "wrong-password"},
    )
    assert invalid_login.status_code == 401
    invalid_login_payload = invalid_login.json()
    assert invalid_login_payload["error"]["code"] == "unauthorized"
    assert invalid_login_payload["error"]["message"] == "Incorrect email or password"

    unauthenticated_me = client.get("/api/v1/auth/me")
    assert unauthenticated_me.status_code == 401
    unauthenticated_payload = unauthenticated_me.json()
    assert unauthenticated_payload["error"]["code"] == "unauthorized"
    assert unauthenticated_payload["error"]["message"] == "Not authenticated"


def test_root_and_health_contracts_are_explicit(client):
    root_response = client.get("/")
    assert root_response.status_code == 200
    assert root_response.json() == {"message": "Welcome to AI LMS API"}

    health_response = client.get("/health")
    assert health_response.status_code == 200
    assert health_response.json() == {"status": "healthy", "database": "connected"}

    health_head_response = client.head("/health")
    assert health_head_response.status_code == 200

    api_health_response = client.get("/api/health")
    assert api_health_response.status_code == 200
    assert api_health_response.json() == {"status": "healthy", "database": "connected"}

    api_health_head_response = client.head("/api/health")
    assert api_health_head_response.status_code == 200
