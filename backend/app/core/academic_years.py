YEAR_VALUES = (1, 2, 3, 4)
DEFAULT_STUDENT_YEAR = 3


def normalize_year_value(value, default: int = DEFAULT_STUDENT_YEAR) -> int:
    if value is None:
        return default

    if isinstance(value, bool):
        raise ValueError("Year must be between 1 and 4")

    if isinstance(value, int):
        year = value
    elif isinstance(value, str):
        normalized = value.strip().lower()
        if not normalized:
            return default

        if normalized.isdigit():
            year = int(normalized)
        else:
            digits = "".join(char for char in normalized if char.isdigit())
            if not digits:
                raise ValueError("Year must be between 1 and 4")
            year = int(digits)
    else:
        raise ValueError("Year must be between 1 and 4")

    if year not in YEAR_VALUES:
        raise ValueError("Year must be between 1 and 4")

    return year
