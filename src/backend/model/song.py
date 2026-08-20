import contextlib
import datetime
import os

from dotenv import load_dotenv
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, Text, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

_DATABASE_URL = os.getenv("DATABASE_URL")


engine = create_engine(
    _DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
)

Session = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class BaseMixin:
    """model的基类,所有model都必须继承"""

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        index=True,
    )
    deleted_at = Column(DateTime)


class FavoriteSong(Base, BaseMixin):
    """收藏歌曲数据模型"""

    __tablename__ = "favorite_songs"
    user_id = Column(Integer, nullable=True, index=True, comment="所属用户ID")
    platform = Column(String(4), nullable=False, comment="歌曲平台")
    song_id = Column(Integer, nullable=False, comment="歌曲ID")


class FavoritePlaylist(Base, BaseMixin):
    """收藏歌单数据模型。"""

    __tablename__ = "favorite_playlists"
    user_id = Column(Integer, nullable=True, index=True, comment="所属用户ID")
    platform = Column(String(8), nullable=False, comment="歌单平台")
    playlist_id = Column(BigInteger, nullable=False, comment="歌单ID")


class SongCache(Base, BaseMixin):
    """歌曲缓存数据模型"""

    __tablename__ = "song_cache"
    platform = Column(String(4), nullable=False, comment="歌曲平台")
    song_id = Column(Integer, nullable=False, comment="歌曲ID")
    song_name = Column(String(255), nullable=True, comment="歌曲名称")
    singer_name = Column(String(255), nullable=True, comment="歌手名称")
    album_name = Column(String(255), nullable=True, comment="专辑名称")
    cover_url = Column(String(255), nullable=True, comment="封面图片URL")
    song_url = Column(String(255), nullable=False, comment="歌曲URL")
    lyrics_data = Column(Text, nullable=True, comment="歌词JSON数据")
    last_played_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        comment="最后播放时间",
    )

    def to_dict(self) -> dict:
        return {
            "platform": self.platform,
            "song_id": self.song_id,
            "song_name": self.song_name,
            "singer_name": self.singer_name,
            "album_name": self.album_name,
            "cover_url": self.cover_url,
            "song_url": self.song_url,
            "last_played_at": self.last_played_at,
        }


class PlaylistCache(Base, BaseMixin):
    """歌单详情缓存数据模型。"""

    __tablename__ = "playlist_cache"
    platform = Column(String(8), nullable=False, comment="歌单平台")
    playlist_id = Column(Integer, nullable=False, comment="歌单ID")
    playlist_data = Column(Text, nullable=False, comment="歌单JSON数据")
    refreshed_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        comment="最后刷新时间",
    )


class User(Base, BaseMixin):
    """iMusic 本地用户。"""

    __tablename__ = "users"
    username = Column(String(64), nullable=False, unique=True, index=True, comment="登录账号")
    password_hash = Column(String(255), nullable=False, comment="密码哈希")
    is_admin = Column(Boolean, nullable=False, default=False, comment="是否管理员")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否允许登录")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "is_admin": self.is_admin,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class UserSession(Base, BaseMixin):
    """持久登录会话，仅保存令牌摘要。"""

    __tablename__ = "user_sessions"
    user_id = Column(Integer, nullable=False, index=True, comment="用户ID")
    token_hash = Column(String(64), nullable=False, unique=True, index=True, comment="会话令牌SHA256")
    expires_at = Column(DateTime, nullable=False, index=True, comment="会话过期时间")


Base.metadata.create_all(engine)


def _ensure_legacy_schema() -> None:
    """为 create_all 无法更新的旧数据库补充新增字段。"""
    schema_updates = {
        "song_cache": {"lyrics_data": "TEXT"},
        "favorite_songs": {"user_id": "INTEGER"},
        "favorite_playlists": {"user_id": "INTEGER"},
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, expected_columns in schema_updates.items():
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in expected_columns.items():
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


_ensure_legacy_schema()


@contextlib.contextmanager
def get_session():
    s = Session()
    try:
        yield s
        s.commit()
    except Exception as e:
        s.rollback()
        raise e
    finally:
        s.close()
