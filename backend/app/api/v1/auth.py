# /app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.api_docs import error_responses
from app.core.permissions import require_admin, require_student
from app.core.security import create_access_token, get_current_user_from_token
from app.database import get_db
from app.models.module import Lesson, Module
from app.models.user import User
from app.schemas.auth import AdminDashboardResponse, StudentProgressSnapshotResponse
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse
from app.services import progress_service, user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _build_token_response(user: User) -> Token:
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    responses=error_responses(400, 422, 500),
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user (automatically gets 'student' role)"""
    try:
        return user_service.create_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            year=user_data.year,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

@router.post("/login", response_model=Token, responses=error_responses(401, 422, 500))
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with JSON credentials and get a JWT token."""
    user = user_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _build_token_response(user)

@router.post("/token", response_model=Token, responses=error_responses(401, 422, 500))
def login_for_docs(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2-compatible token endpoint for Swagger Authorize flow."""
    user = user_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _build_token_response(user)

@router.get("/me", response_model=UserResponse, responses=error_responses(401, 500))
def get_current_user_info(current_user: User = Depends(get_current_user_from_token)):
    """Get current user info (any logged-in user)"""
    return current_user

@router.get(
    "/admin/dashboard",
    response_model=AdminDashboardResponse,
    responses=error_responses(401, 403, 500),
)
def admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only dashboard with live counts."""
    return {
        "message": f"Welcome admin {current_user.email}!",
        "role": current_user.role.role_name,
        "stats": {
            "total_users": db.query(User).count(),
            "total_modules": db.query(Module).count(),
            "total_lessons": db.query(Lesson).count(),
        },
    }

@router.get(
    "/student/progress",
    response_model=StudentProgressSnapshotResponse,
    responses=error_responses(401, 403, 500),
)
def student_progress(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """Student-only progress snapshot backed by real progress data."""
    stats = progress_service.get_learning_stats(db, current_user)
    return {
        "message": f"Your progress, {current_user.first_name}!",
        "completed_lessons": stats.completed_lessons,
        "total_lessons": stats.total_lessons,
        "completion_percentage": stats.completion_percentage,
    }


from pydantic import BaseModel
from typing import Optional

class GoogleLoginRequest(BaseModel):
    credential: str
    year: Optional[int] = None


@router.post("/google", response_model=Token, responses=error_responses(400, 401, 422, 500))
def google_auth(request_data: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Authenticate or register a user with Google ID token."""
    import base64
    import json
    import uuid
    from app.core.security import hash_password
    from app.models.role import Role
    
    credential = request_data.credential
    year = request_data.year or 3
    
    try:
        parts = credential.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid Google token format")
        payload_b64 = parts[1]
        padded_payload = payload_b64 + "=" * (4 - len(payload_b64) % 4)
        decoded_payload = base64.urlsafe_b64decode(padded_payload).decode("utf-8")
        payload = json.loads(decoded_payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Google credential: {str(e)}")
        
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google token does not contain email")
        
    first_name = payload.get("given_name") or payload.get("name", "Student").split(" ")[0]
    last_name = payload.get("family_name") or "Learner"
    if len(payload.get("name", "").split(" ")) > 1 and not payload.get("family_name"):
        last_name = " ".join(payload.get("name").split(" ")[1:])
        
    # Check if user already exists
    user = user_service.get_user_by_email(db, email)
    
    if not user:
        # Create a new user (Google Sign Up)
        student_role = db.query(Role).filter(Role.role_name == "student").first()
        if not student_role:
            student_role = Role(role_name="student")
            db.add(student_role)
            db.commit()
            db.refresh(student_role)
            
        user = User(
            user_id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(str(uuid.uuid4())),
            first_name=first_name,
            last_name=last_name,
            year=year,
            role_id=student_role.role_id,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return _build_token_response(user)

