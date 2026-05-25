from app.schemas.common import ErrorResponse


ERROR_RESPONSE_MODELS = {
    400: {"model": ErrorResponse, "description": "Bad request"},
    401: {"model": ErrorResponse, "description": "Authentication required"},
    403: {"model": ErrorResponse, "description": "Permission denied"},
    404: {"model": ErrorResponse, "description": "Resource not found"},
    502: {"model": ErrorResponse, "description": "Upstream service failure"},
    422: {"model": ErrorResponse, "description": "Validation failed"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}


def error_responses(*codes: int) -> dict[int, dict]:
    return {code: ERROR_RESPONSE_MODELS[code] for code in codes}
