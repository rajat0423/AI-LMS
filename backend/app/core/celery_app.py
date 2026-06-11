# /app/core/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "lms_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Load task modules from all registered app locations
celery_app.autodiscover_tasks(["app"])

# Optimized configuration for performance
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes maximum runtime for tasks
)
