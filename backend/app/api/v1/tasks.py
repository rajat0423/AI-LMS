# /app/api/v1/tasks.py
from fastapi import APIRouter, HTTPException
from app.core.celery_app import celery_app

router = APIRouter(prefix="/tasks", tags=["Background Tasks"])


@router.get("/{task_id}")
def get_task_status(task_id: str):
    """Retrieve the status and results of a Celery background task by task_id."""
    try:
        res = celery_app.AsyncResult(task_id)
        response = {
            "task_id": task_id,
            "status": res.status,
            "ready": res.ready(),
        }
        if res.ready():
            if res.failed():
                response["error"] = str(res.result)
            else:
                response["result"] = res.result
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch task status: {exc}")
