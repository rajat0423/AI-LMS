import logging
import time
from collections import defaultdict

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.auth import router as auth_router
from app.api.v1.career_analysis import router as career_analysis_router
from app.api.v1.modules import router as modules_router
from app.api.v1.progress import router as progress_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.payments import router as payments_router
from app.api.v1.content_tools import router as content_tools_router
from app.api.v1.personality import router as personality_router
from app.api.v1.chat import router as chat_router
from app.api.v1.profile import router as profile_router
from app.api.v1.search import router as search_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.admin_users import router as admin_users_router
from app.api.v1.admin_content import router as admin_content_router
from app.api.v1.quiz import router as quiz_router
from app.api.v1.certificate import router as certificate_router
from app.api.v1.community import router as community_router
from app.database import Base, engine
from app.models import *  # noqa: F401,F403
from app.schemas.common import ApiMessageResponse, ErrorResponse, HealthResponse
try:
    from seed_course1 import seed as seed_year_one_course
except ImportError:
    logger.warning("seed_course1 module not found – skipping year-one seeding.")
    def seed_year_one_course():
        pass

try:
    from seed_course2 import seed as seed_year_two_course
except ImportError:
    logger.warning("seed_course2 module not found – skipping year-two seeding.")
    def seed_year_two_course():
        pass

try:
    from seed_course3 import seed as seed_year_three_course
except ImportError:
    logger.warning("seed_course3 module not found – skipping year-three seeding.")
    def seed_year_three_course():
        pass

try:
    from seed_course4 import seed as seed_year_four_course
except ImportError:
    logger.warning("seed_course4 module not found – skipping year-four seeding.")
    def seed_year_four_course():
        pass



import os
from app.core.config import settings

# Auto-create directory for SQLite file databases if it doesn't exist
if settings.DATABASE_URL.startswith("sqlite:///./"):
    db_path = settings.DATABASE_URL.replace("sqlite:///./", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

Base.metadata.create_all(bind=engine)

ERROR_CODES = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "unauthorized",
    status.HTTP_403_FORBIDDEN: "forbidden",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
    status.HTTP_502_BAD_GATEWAY: "upstream_error",
    status.HTTP_422_UNPROCESSABLE_CONTENT: "validation_error",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "internal_server_error",
}


def build_error_response(
    *,
    status_code: int,
    message: str,
    code: str | None = None,
    details=None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        headers=headers,
        content={
            "error": {
                "code": code or ERROR_CODES.get(status_code, "error"),
                "message": message,
                "details": details,
            }
        },
    )

app = FastAPI(
    title="AI LMS Platform",
    description="AI-powered Learning Management System",
    version="1.0.0",
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        401: {"model": ErrorResponse, "description": "Authentication required"},
        403: {"model": ErrorResponse, "description": "Permission denied"},
        404: {"model": ErrorResponse, "description": "Resource not found"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
        502: {"model": ErrorResponse, "description": "Upstream service failure"},
        422: {"model": ErrorResponse, "description": "Validation failed"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)


# Rate Limiting Middleware -------------------------------------------------
import threading

def run_async_seeding():
    logger.info("Background database seeding started...")
    try:
        seed_year_one_course()
    except Exception as exc:
        logger.exception("Failed to seed first-year module quizzes: %s", exc)
    try:
        seed_year_two_course()
    except Exception as exc:
        logger.exception("Failed to seed second-year module quizzes: %s", exc)
    try:
        seed_year_three_course()
    except Exception as exc:
        logger.exception("Failed to seed third-year module quizzes: %s", exc)
    try:
        seed_year_four_course()
    except Exception as exc:
        logger.exception("Failed to seed fourth-year module quizzes: %s", exc)
    logger.info("Background database seeding complete.")

@app.on_event("startup")
def start_seeding_task():
    """Ensure first-year, second-year, third-year, and fourth-year module quizzes exist in a non-blocking background thread."""
    threading.Thread(target=run_async_seeding, daemon=True).start()




# Simple in-memory rate limiter: 60 requests per minute per IP
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 60     # max requests per window
_rate_limit_store: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic sliding-window rate limiter by client IP."""
    # Skip rate limiting for health checks and docs
    if request.url.path in ("/health", "/ping", "/api/health", "/api/ping", "/", "/docs", "/openapi.json", "/redoc"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    if client_ip == "testclient":
        return await call_next(request)

    now = time.time()

    # Clean old entries
    _rate_limit_store[client_ip] = [
        ts for ts in _rate_limit_store[client_ip] if now - ts < RATE_LIMIT_WINDOW
    ]

    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        return build_error_response(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            message="Rate limit exceeded. Please slow down.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
        )

    _rate_limit_store[client_ip].append(now)
    response = await call_next(request)
    return response


import os
cors_origins = [
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://aaoseekhe.live",
    "https://www.aaoseekhe.live"
]
env_cors = os.environ.get("CORS_ORIGINS")
if env_cors:
    for origin in env_cors.split(','):
        clean_origin = origin.strip().rstrip('/')
        if clean_origin and clean_origin not in cors_origins:
            cors_origins.append(clean_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_origin_regex=r"https://.*|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(profile_router, prefix="/api/v1")
app.include_router(career_analysis_router, prefix="/api/v1")
app.include_router(modules_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")
app.include_router(submissions_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(content_tools_router, prefix="/api/v1")
app.include_router(personality_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(admin_users_router, prefix="/api/v1")
app.include_router(admin_content_router, prefix="/api/v1")
app.include_router(quiz_router, prefix="/api/v1")
app.include_router(certificate_router, prefix="/api/v1")
app.include_router(community_router, prefix="/api/v1")

@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    details = None if isinstance(exc.detail, str) else exc.detail
    return build_error_response(
        status_code=exc.status_code,
        message=detail,
        details=details,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return build_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="validation_error",
        message="Request validation failed",
        details=details,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, _exc: Exception):
    return build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Internal server error",
    )


@app.get("/", response_model=ApiMessageResponse, responses={500: {"model": ErrorResponse}})
def read_root():
    return ApiMessageResponse(message="Welcome to AI LMS API")


@app.get("/health", response_model=HealthResponse, responses={500: {"model": ErrorResponse}})
def health_check():
    return HealthResponse(status="healthy", database="connected")

@app.head("/health")
def health_check_head():
    return Response(status_code=200)


@app.get("/ping")
def ping():
    """Ultra-lightweight liveness check. No DB call. Use this for UptimeRobot."""
    return {"status": "ok"}

@app.head("/ping")
def ping_head():
    return Response(status_code=200)

@app.get("/api/health", response_model=HealthResponse, responses={500: {"model": ErrorResponse}})
def api_health_check():
    return HealthResponse(status="healthy", database="connected")

@app.head("/api/health")
def api_health_check_head():
    return Response(status_code=200)

@app.get("/api/ping")
def api_ping():
    return {"status": "ok"}

@app.head("/api/ping")
def api_ping_head():
    return Response(status_code=200)
