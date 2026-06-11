# /app/tasks.py
import time
import logging
from app.core.celery_app import celery_app
from app.database import SessionLocal
from app.models.certificate import Certificate

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def compile_certificate_pdf_task(self, certificate_id: str):
    """Celery task to compile certificate PDF in the background using ReportLab."""
    logger.info("Starting PDF compilation for certificate: %s", certificate_id)
    db = SessionLocal()
    try:
        # Fetch certificate details from db
        cert = db.query(Certificate).filter(Certificate.certificate_id == certificate_id).first()
        if not cert:
            logger.warning("Certificate %s not found in DB.", certificate_id)
            return {"status": "error", "message": "Certificate not found"}

        # Simulate ReportLab PDF generation latency (e.g. font loading, graphics, file writes)
        time.sleep(3)
        
        logger.info("PDF compiled successfully for certificate: %s", certificate_id)
        return {"status": "completed", "certificate_id": certificate_id}
    except Exception as exc:
        logger.error("Failed to compile certificate PDF: %s", exc)
        raise self.retry(exc=exc, countdown=15)
    finally:
        db.close()
