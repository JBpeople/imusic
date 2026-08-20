from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(..., min_length=8, max_length=128)


class UserCreateRequest(LoginRequest):
    is_admin: bool = Field(default=False)


class UserStatusRequest(BaseModel):
    is_active: bool


class PasswordResetRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)
