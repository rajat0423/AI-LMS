# create_admin.py
from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.core.security import hash_password
import uuid

db = SessionLocal()

# Get admin role
admin_role = db.query(Role).filter(Role.role_name == "admin").first()

# Create admin user
admin = User(
    user_id=uuid.uuid4(),
    email="deepakkanoujiya07@gmail.com",
    password_hash=hash_password("admin123"),
    first_name="Admin",
    last_name="User",
    role_id=admin_role.role_id,
    is_active=True
)

db.add(admin)
db.commit()
print("✅ Admin created: admin@lms.com / admin123")
db.close()