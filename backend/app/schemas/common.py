from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ApiMessageResponse(BaseModel):
    message: str

    model_config = ConfigDict(extra="forbid")


class HealthResponse(BaseModel):
    status: str
    database: str

    model_config = ConfigDict(extra="forbid")


class ErrorInfo(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

    model_config = ConfigDict(extra="forbid")


class ErrorResponse(BaseModel):
    error: ErrorInfo

    model_config = ConfigDict(extra="forbid")
