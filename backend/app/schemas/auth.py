from pydantic import BaseModel, ConfigDict


class AdminDashboardStatsResponse(BaseModel):
    total_users: int
    total_modules: int
    total_lessons: int

    model_config = ConfigDict(extra="forbid")


class AdminDashboardResponse(BaseModel):
    message: str
    role: str
    stats: AdminDashboardStatsResponse

    model_config = ConfigDict(extra="forbid")


class StudentProgressSnapshotResponse(BaseModel):
    message: str
    completed_lessons: int
    total_lessons: int
    completion_percentage: float

    model_config = ConfigDict(extra="forbid")
