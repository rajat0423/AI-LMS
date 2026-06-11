# /app/core/permissions.py
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import get_current_user_from_token  # We'll create this

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, 
                 current_user: User = Depends(get_current_user_from_token),
                 db: Session = Depends(get_db)
    ):
        # Get user's role
        user_role = current_user.role.role_name if current_user.role else None
        
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{user_role}' is not authorized. Required: {self.allowed_roles}"
            )
        
        return current_user

# Pre-defined role checkers
require_student = RoleChecker(["student", "admin"])
require_admin = RoleChecker(["admin"])
require_either = RoleChecker(["student", "admin"])

def require_premium(current_user: User = Depends(require_student)):
    # Admins bypass premium check automatically
    if current_user.role and current_user.role.role_name == "admin":
        return current_user
        
    if not current_user.subscription or current_user.subscription.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Premium subscription required"
        )
    return current_user