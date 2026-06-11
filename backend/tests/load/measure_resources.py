import os
import psutil
import redis
import sys
from sqlalchemy import create_engine, text

# Default connection settings
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/lms")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

def get_db_connections():
    try:
        # Convert postgres:// to postgresql:// if needed
        db_url = DATABASE_URL
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT count(*) FROM pg_stat_activity"))
            return result.scalar()
    except Exception as exc:
        return f"Error: {exc}"

def get_redis_memory():
    try:
        r = redis.Redis.from_url(REDIS_URL)
        info = r.info('memory')
        return info.get('used_memory_human', 'N/A')
    except Exception as exc:
        return f"Error: {exc}"

def get_process_metrics():
    uvicorn_procs = []
    # Search for uvicorn or python running main
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmd = proc.info['cmdline']
            if cmd:
                cmd_str = " ".join(cmd).lower()
                if "uvicorn" in cmd_str and ("app.main:app" in cmd_str or "main" in cmd_str):
                    uvicorn_procs.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
            
    if not uvicorn_procs:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmd = proc.info['cmdline']
                if cmd:
                    cmd_str = " ".join(cmd).lower()
                    if "python" in cmd_str and ("app.main:app" in cmd_str or "main.py" in cmd_str):
                        uvicorn_procs.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

    if not uvicorn_procs:
        return []

    results = []
    for proc in uvicorn_procs:
        try:
            cpu = proc.cpu_percent(interval=0.1)
            mem = proc.memory_info().rss / (1024 * 1024) # MB
            results.append({
                "pid": proc.pid,
                "cpu_percent": cpu,
                "memory_mb": round(mem, 2)
            })
        except Exception:
            continue
    return results

if __name__ == "__main__":
    print(f"PostgreSQL Connections: {get_db_connections()}")
    print(f"Redis Memory Usage: {get_redis_memory()}")
    print(f"FastAPI Process Metrics: {get_process_metrics()}")
