# /app/services/user_service.py
from sqlalchemy.orm import Session
import uuid

from app.core.academic_years import normalize_year_value
from app.core.security import hash_password, verify_password
from app.models.role import Role
from app.models.user import User

def create_user(
    db: Session,
    email: str,
    password: str,
    first_name: str,
    last_name: str,
    year: int,
) -> User:
    """Create a new user with hashed password"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise ValueError("Email already registered")
    
    # Get default "student" role
    student_role = db.query(Role).filter(Role.role_name == "student").first()
    if not student_role:
        # Create student role if it doesn't exist (for development)
        student_role = Role(role_name="student")
        db.add(student_role)
        db.commit()
        db.refresh(student_role)
    
    # Hash password
    hashed_password = hash_password(password)
    
    # Create new user
    new_user = User(
        user_id=uuid.uuid4(),
        email=email,
        password_hash=hashed_password,
        first_name=first_name,
        last_name=last_name,
        year=normalize_year_value(year),
        role_id=student_role.role_id,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

def get_user_by_email(db: Session, email: str) -> User | None:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str) -> User | None:
    """Get user by ID"""
    return db.query(User).filter(User.user_id == user_id).first()

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Return the user when credentials are valid."""
    user = get_user_by_email(db, email)
    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user
