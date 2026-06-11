# /app/core/cache.py
import json
import logging
import uuid
from datetime import datetime, date
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazy initialization of Redis client
redis_client: Optional[aioredis.Redis] = None


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON Encoder that handles UUID and datetime serialization."""
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def get_redis_client() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    return redis_client


async def cache_set(key: str, value: Any, ttl: int = 3600) -> bool:
    """Serialize value to JSON and store in Redis with TTL. Returns True on success, False otherwise."""
    try:
        client = get_redis_client()
        serialized = json.dumps(value, cls=CustomJSONEncoder)
        await client.set(key, serialized, ex=ttl)
        return True
    except Exception as exc:
        logger.warning("Redis cache_set failed for key %s: %s", key, exc)
        return False


async def cache_get(key: str) -> Optional[Any]:
    """Retrieve value from Redis and deserialize JSON. Returns None on cache miss or error."""
    try:
        client = get_redis_client()
        data = await client.get(key)
        if data is not None:
            return json.loads(data)
    except Exception as exc:
        logger.warning("Redis cache_get failed for key %s: %s", key, exc)
    return None


async def cache_delete(key: str) -> bool:
    """Delete a key from Redis. Returns True on success, False otherwise."""
    try:
        client = get_redis_client()
        await client.delete(key)
        return True
    except Exception as exc:
        logger.warning("Redis cache_delete failed for key %s: %s", key, exc)
        return False
