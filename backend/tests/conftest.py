import os
import sys
import uuid
from pathlib import Path

# Add the backend directory to the Python path so 'app' can be resolved
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault("DATABASE_URL", "sqlite:///./backend_test_bootstrap.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(UUID, "sqlite")
def compile_uuid_sqlite(_type, _compiler, **_kwargs):
    return "CHAR(36)"


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(_type, _compiler, **_kwargs):
    return "JSON"


from app.core.security import hash_password
from app.core.config import settings
from app.database import Base, get_db
from app.main import app
from app.models import Role, User


TEST_DATABASE_URL = "sqlite://"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def _get_or_create_role(db_session, role_name: str) -> Role:
    role = db_session.query(Role).filter(Role.role_name == role_name).first()
    if role:
        return role

    role = Role(role_name=role_name)
    db_session.add(role)
    db_session.commit()
    db_session.refresh(role)
    return role


@pytest.fixture()
def db_session():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def create_user(db_session):
    def factory(
        *,
        role_name: str = "student",
        email: str | None = None,
        password: str = "securepass123",
        first_name: str = "Test",
        last_name: str = "User",
        year: int = 3,
        is_active: bool = True,
        is_premium: bool = False,
    ) -> tuple[User, str]:
        role = _get_or_create_role(db_session, role_name)
        user = User(
            email=email or f"{role_name}-{uuid.uuid4().hex[:8]}@example.com",
            password_hash=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            year=year,
            role_id=role.role_id,
            is_active=is_active,
        )
        db_session.add(user)
        db_session.commit()
        
        if is_premium:
            from app.models.subscription import Subscription
            sub = Subscription(user_id=user.user_id, plan_type="premium", status="active")
            db_session.add(sub)
            db_session.commit()
            
        db_session.refresh(user)
        return user, password

    return factory


@pytest.fixture()
def auth_headers(client):
    def factory(email: str, password: str) -> dict[str, str]:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert response.status_code == 200, response.text
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return factory


@pytest.fixture()
def career_upload_dir(tmp_path, monkeypatch):
    upload_dir = tmp_path / "career_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(settings, "CAREER_UPLOAD_DIR", str(upload_dir))
    monkeypatch.setattr(settings, "CAREER_UPLOAD_MAX_BYTES", 1024 * 1024)
    return upload_dir
