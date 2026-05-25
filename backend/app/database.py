# app/database.py
from sqlalchemy import create_engine, event
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings


# SQLite compatibility for PostgreSQL types
@compiles(UUID, "sqlite")
def compile_uuid_sqlite(_type, _compiler, **_kwargs):
    return "CHAR(36)"


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(_type, _compiler, **_kwargs):
    return "JSON"


engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 3600,
}

# Create engine with proper settings for PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

if settings.DATABASE_URL.startswith("postgresql"):
    @event.listens_for(engine, "connect")
    def set_postgres_search_path(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("SET search_path TO public")
        finally:
            cursor.close()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class - THIS IS WHAT ALEMBIC NEEDS!
Base = declarative_base()

# Dependency to get database session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
