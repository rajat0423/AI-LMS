from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user_from_token
from app.models.certificate import Certificate
from app.models.module import Module
from app.models.user import User

router = APIRouter(prefix="/certificate", tags=["Certificates"])

@router.post("/{module_id}/generate")
async def generate_certificate(module_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_token)):
    # In a real app we check if module is actually 100% complete
    # For now, allow generation
    mod = db.query(Module).filter(Module.module_id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
        
    existing = db.query(Certificate).filter(Certificate.user_id == current_user.user_id, Certificate.module_id == module_id).first()
    if existing:
        return {"certificate_id": existing.certificate_id, "issued_at": existing.issued_at, "module_title": mod.title, "user_name": f"{current_user.first_name} {current_user.last_name}"}
        
    cert = Certificate(user_id=current_user.user_id, module_id=module_id)
    db.add(cert)
    db.commit()
    db.refresh(cert)
    
    return {"certificate_id": cert.certificate_id, "issued_at": cert.issued_at, "module_title": mod.title, "user_name": f"{current_user.first_name} {current_user.last_name}"}

@router.get("/")
async def get_my_certificates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_token)):
    certs = db.query(Certificate).filter(Certificate.user_id == current_user.user_id).all()
    res = []
    for c in certs:
        mod = db.query(Module).filter(Module.module_id == c.module_id).first()
        res.append({
            "certificate_id": c.certificate_id,
            "issued_at": c.issued_at,
            "module_title": mod.title if mod else "Unknown Course",
            "user_name": f"{current_user.first_name} {current_user.last_name}"
        })
    return res
