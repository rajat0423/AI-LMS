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
    "pool_size": 50,
    "max_overflow": 100,
    "pool_timeout": 30,
    "pool_recycle": 1800,
    "pool_pre_ping": True,
}

import os
import time
import sys
db_url = settings.DATABASE_URL
engine = None
fallback_active = False

if db_url.startswith("postgresql") or db_url.startswith("postgres"):
    retries = 5
    for attempt in range(1, retries + 1):
        try:
            from sqlalchemy import text
            test_engine = create_engine(db_url, **engine_kwargs)
            with test_engine.connect() as conn:
                # Execute a lightweight check
                conn.execute(text("SELECT 1"))
            engine = test_engine
            print(f"🚀 Successfully connected to PostgreSQL (attempt {attempt}/{retries})", file=sys.stderr)
            break
        except Exception as exc:
            print(f"⚠️ Attempt {attempt}/{retries} to connect to PostgreSQL failed: {exc}. Retrying...", file=sys.stderr)
            if attempt < retries:
                time.sleep(2 ** attempt)
            else:
                print("🚨 All PostgreSQL connection attempts failed. Activating high-availability SQLite fallback.", file=sys.stderr)
                fallback_active = True

if not engine:
    # Use SQLite as fallback
    db_url = "sqlite:///./data/auth.db"
    if fallback_active:
        db_url = "sqlite:///./data/fallback.db"
    
    db_path = db_url.replace("sqlite:///./", "").replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )


if db_url.startswith("postgresql"):
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
