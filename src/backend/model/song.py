import contextlib
import datetime
import os

from dotenv import load_dotenv
from sqlalchemy import BigInteger, Column, DateTime, Integer, String, Text, create_engine, inspect, text
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
    platform = Column(String(4), nullable=False, comment="歌曲平台")
    song_id = Column(Integer, nullable=False, comment="歌曲ID")


class FavoritePlaylist(Base, BaseMixin):
    """收藏歌单数据模型。"""

    __tablename__ = "favorite_playlists"
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


Base.metadata.create_all(engine)


def _ensure_song_cache_schema() -> None:
    """为 create_all 无法更新的旧数据库补充歌词缓存字段。"""
    if "lyrics_data" in {column["name"] for column in inspect(engine).get_columns("song_cache")}:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE song_cache ADD COLUMN lyrics_data TEXT"))


_ensure_song_cache_schema()


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
