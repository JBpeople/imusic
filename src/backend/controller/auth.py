import base64
import datetime
import hashlib
import hmac
import secrets

from src.backend.model import FavoritePlaylist, FavoriteSong, User, UserSession, get_session
from src.backend.schemas import ResponseSchemas

SESSION_DAYS = 30
PBKDF2_ITERATIONS = 310_000


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_value, digest_value = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_value.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthController:
    @staticmethod
    def setup_status() -> ResponseSchemas:
        with get_session() as session:
            return ResponseSchemas(code=200, msg="success", data=[{"setup_required": session.query(User).count() == 0}])

    @staticmethod
    def setup(username: str, password: str) -> tuple[ResponseSchemas, str | None]:
        with get_session() as session:
            if session.query(User).count() != 0:
                return ResponseSchemas(code=409, msg="系统已经完成初始化", data=None), None
            user = User(username=username.lower(), password_hash=_hash_password(password), is_admin=True, is_active=True)
            session.add(user)
            session.flush()
            session.query(FavoriteSong).filter(FavoriteSong.user_id.is_(None)).update({FavoriteSong.user_id: user.id})
            session.query(FavoritePlaylist).filter(FavoritePlaylist.user_id.is_(None)).update({FavoritePlaylist.user_id: user.id})
            token = secrets.token_urlsafe(32)
            session.add(
                UserSession(
                    user_id=user.id,
                    token_hash=_token_hash(token),
                    expires_at=_utcnow() + datetime.timedelta(days=SESSION_DAYS),
                )
            )
            session.commit()
            return ResponseSchemas(code=200, msg="created", data=[user.to_dict()]), token

    @staticmethod
    def login(username: str, password: str) -> tuple[ResponseSchemas, str | None]:
        with get_session() as session:
            user = session.query(User).filter(User.username == username.lower(), User.deleted_at.is_(None)).first()
            if not user or not _verify_password(password, user.password_hash):
                return ResponseSchemas(code=401, msg="账号或密码错误", data=None), None
            if not user.is_active:
                return ResponseSchemas(code=403, msg="账号已被停用", data=None), None
            token = secrets.token_urlsafe(32)
            session.add(
                UserSession(
                    user_id=user.id,
                    token_hash=_token_hash(token),
                    expires_at=_utcnow() + datetime.timedelta(days=SESSION_DAYS),
                )
            )
            session.commit()
            return ResponseSchemas(code=200, msg="success", data=[user.to_dict()]), token

    @staticmethod
    def authenticate(token: str | None) -> User | None:
        if not token:
            return None
        with get_session() as session:
            user_session = (
                session.query(UserSession)
                .filter(UserSession.token_hash == _token_hash(token), UserSession.deleted_at.is_(None))
                .first()
            )
            if not user_session:
                return None
            expires_at = user_session.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
            if expires_at <= _utcnow():
                user_session.deleted_at = _utcnow()
                session.commit()
                return None
            user = session.query(User).filter(User.id == user_session.user_id, User.deleted_at.is_(None)).first()
            if not user or not user.is_active:
                return None
            session.expunge(user)
            return user

    @staticmethod
    def logout(token: str | None) -> ResponseSchemas:
        if token:
            with get_session() as session:
                session.query(UserSession).filter(UserSession.token_hash == _token_hash(token)).update(
                    {UserSession.deleted_at: _utcnow()}
                )
        return ResponseSchemas(code=200, msg="success", data=None)

    @staticmethod
    def list_users() -> ResponseSchemas:
        with get_session() as session:
            users = session.query(User).filter(User.deleted_at.is_(None)).order_by(User.created_at.asc()).all()
            return ResponseSchemas(code=200, msg="success", data=[user.to_dict() for user in users])

    @staticmethod
    def create_user(username: str, password: str, is_admin: bool = False) -> ResponseSchemas:
        with get_session() as session:
            normalized = username.lower()
            if session.query(User).filter(User.username == normalized, User.deleted_at.is_(None)).first():
                return ResponseSchemas(code=409, msg="账号已经存在", data=None)
            user = User(
                username=normalized,
                password_hash=_hash_password(password),
                is_admin=is_admin,
                is_active=True,
            )
            session.add(user)
            session.commit()
            return ResponseSchemas(code=200, msg="created", data=[user.to_dict()])

    @staticmethod
    def set_user_active(user_id: int, is_active: bool, operator_id: int) -> ResponseSchemas:
        if user_id == operator_id and not is_active:
            return ResponseSchemas(code=400, msg="不能停用当前登录账号", data=None)
        with get_session() as session:
            user = session.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
            if not user:
                return ResponseSchemas(code=404, msg="用户不存在", data=None)
            user.is_active = is_active
            if not is_active:
                session.query(UserSession).filter(UserSession.user_id == user.id, UserSession.deleted_at.is_(None)).update(
                    {UserSession.deleted_at: _utcnow()}
                )
            session.commit()
            return ResponseSchemas(code=200, msg="success", data=[user.to_dict()])

    @staticmethod
    def reset_password(user_id: int, password: str) -> ResponseSchemas:
        with get_session() as session:
            user = session.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
            if not user:
                return ResponseSchemas(code=404, msg="用户不存在", data=None)
            user.password_hash = _hash_password(password)
            session.query(UserSession).filter(UserSession.user_id == user.id, UserSession.deleted_at.is_(None)).update(
                {UserSession.deleted_at: _utcnow()}
            )
            session.commit()
            return ResponseSchemas(code=200, msg="success", data=None)
