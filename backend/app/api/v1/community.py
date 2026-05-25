from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import get_current_user_from_token
from app.models.community import DiscussionThread, DiscussionReply
from app.models.user import User

router = APIRouter(prefix="/community", tags=["Community Forum"])

@router.get("/")
async def get_threads(db: Session = Depends(get_db)):
    threads = db.query(DiscussionThread).order_by(DiscussionThread.created_at.desc()).all()
    res = []
    for t in threads:
        user = db.query(User).filter(User.user_id == t.user_id).first()
        reply_count = db.query(DiscussionReply).filter(DiscussionReply.thread_id == t.thread_id).count()
        res.append({
            "thread_id": t.thread_id,
            "title": t.title,
            "content": t.content[:100] + ("..." if len(t.content)>100 else ""),
            "author": f"{user.first_name} {user.last_name}" if user else "Deleted User",
            "replies": reply_count,
            "created_at": t.created_at
        })
    return res

@router.get("/{thread_id}")
async def get_thread(thread_id: str, db: Session = Depends(get_db)):
    t = db.query(DiscussionThread).filter(DiscussionThread.thread_id == thread_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    user = db.query(User).filter(User.user_id == t.user_id).first()
    
    replies = []
    for r in t.replies:
        r_user = db.query(User).filter(User.user_id == r.user_id).first()
        replies.append({
            "reply_id": r.reply_id,
            "content": r.content,
            "author": f"{r_user.first_name} {r_user.last_name}" if r_user else "Deleted User",
            "created_at": r.created_at
        })
        
    return {
        "thread_id": t.thread_id,
        "title": t.title,
        "content": t.content,
        "author": f"{user.first_name} {user.last_name}" if user else "Deleted User",
        "created_at": t.created_at,
        "replies": replies
    }

@router.post("/")
async def create_thread(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_token)):
    t = DiscussionThread(
        user_id=current_user.user_id,
        title=payload.get("title"),
        content=payload.get("content")
    )
    db.add(t)
    db.commit()
    return {"thread_id": t.thread_id}

@router.post("/{thread_id}/reply")
async def reply_thread(thread_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_from_token)):
    r = DiscussionReply(
        thread_id=thread_id,
        user_id=current_user.user_id,
        content=payload.get("content")
    )
    db.add(r)
    db.commit()
    return {"reply_id": r.reply_id}
