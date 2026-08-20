from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from src.backend.controller import AuthController
from src.backend.model import User
from src.backend.schemas import LoginRequest, PasswordResetRequest, ResponseSchemas, UserCreateRequest, UserStatusRequest

SESSION_COOKIE = "imusic_session"
auth_router = APIRouter(prefix="/api/v1/auth", tags=["用户认证"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=30 * 24 * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )


def require_user(imusic_session: str | None = Cookie(default=None)) -> User:
    user = AuthController.authenticate(imusic_session)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


@auth_router.get("/setup_status")
def setup_status() -> ResponseSchemas:
    return AuthController.setup_status()


@auth_router.post("/setup")
def setup(request: LoginRequest, response: Response) -> ResponseSchemas:
    result, token = AuthController.setup(request.username, request.password)
    if token:
        _set_session_cookie(response, token)
    return result


@auth_router.post("/login")
def login(request: LoginRequest, response: Response) -> ResponseSchemas:
    result, token = AuthController.login(request.username, request.password)
    if token:
        _set_session_cookie(response, token)
    return result


@auth_router.post("/logout")
def logout(response: Response, imusic_session: str | None = Cookie(default=None)) -> ResponseSchemas:
    result = AuthController.logout(imusic_session)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return result


@auth_router.get("/me")
def me(user: User = Depends(require_user)) -> ResponseSchemas:
    return ResponseSchemas(code=200, msg="success", data=[user.to_dict()])


@auth_router.get("/users")
def list_users(_: User = Depends(require_admin)) -> ResponseSchemas:
    return AuthController.list_users()


@auth_router.post("/users")
def create_user(request: UserCreateRequest, _: User = Depends(require_admin)) -> ResponseSchemas:
    return AuthController.create_user(request.username, request.password, request.is_admin)


@auth_router.patch("/users/{user_id}/status")
def set_user_status(user_id: int, request: UserStatusRequest, operator: User = Depends(require_admin)) -> ResponseSchemas:
    return AuthController.set_user_active(user_id, request.is_active, operator.id)


@auth_router.put("/users/{user_id}/password")
def reset_password(user_id: int, request: PasswordResetRequest, _: User = Depends(require_admin)) -> ResponseSchemas:
    return AuthController.reset_password(user_id, request.password)
