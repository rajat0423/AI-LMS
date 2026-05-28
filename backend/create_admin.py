import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password
import uuid

backend_root = Path(__file__).resolve().parent
load_dotenv(backend_root / ".env")

database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin role exists
        admin_role = db.query(Role).filter(Role.role_name == "admin").first()
        if not admin_role:
            admin_role = Role(role_id=uuid.uuid4(), role_name="admin", permissions={})
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        # Check if user exists
        email = "dpklms@admin.com"
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User {email} already exists. Updating password and role...")
            user.password_hash = hash_password("Dpk@247+")
            user.role_id = admin_role.role_id
        else:
            user = User(
                user_id=uuid.uuid4(),
                email=email,
                password_hash=hash_password("Dpk@247+"),
                first_name="Deepak",
                last_name="LMS",
                year=3,
                role_id=admin_role.role_id,
                is_active=True
            )
            db.add(user)
        
        db.commit()
        print("Admin user created/updated successfully!")
        print(f"Login Email: {email}")
        print("Password: Dpk@247+")
        
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
