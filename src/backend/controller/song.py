import datetime
import json

from sqlalchemy import func

from src.backend.model import FavoriteSong, PlaylistCache, SongCache, get_session
from src.backend.schemas import ResponseSchemas, SongCacheSchemas, SongSchemas


class FavoriteSongController:
    @staticmethod
    def add_favorite_song(request: SongSchemas) -> ResponseSchemas:
        """添加喜欢歌曲

        Args:
            request (FavoriteSongSchemas): 请求参数

        Returns:
            ResponseSchemas: 响应结果
        """
        with get_session() as session:
            favorite_song = (
                session.query(FavoriteSong)
                .filter(FavoriteSong.platform == request.platform, FavoriteSong.song_id == request.song_id)
                .first()
            )

            if not favorite_song:
                session.add(FavoriteSong(platform=request.platform, song_id=request.song_id))
                session.commit()
            else:
                favorite_song.deleted_at = None
                favorite_song.updated_at = datetime.datetime.now(datetime.timezone.utc)
                session.commit()
            return ResponseSchemas(code=200, msg="success", data=None)
    @staticmethod
    def get_favorite_songs(limit: int = 15, offset: int = 0) -> ResponseSchemas:
        """获取喜欢的歌

        Returns:
            ResponseSchemas: 响应结果
        """
        with get_session() as session:
            favorite_songs = (
                session.query(FavoriteSong).filter(FavoriteSong.deleted_at.is_(None)).offset(offset).limit(limit).all()
            )
            data = []
            for item in favorite_songs:
                cache = (
                    session.query(SongCache)
                    .filter(SongCache.platform == item.platform, SongCache.song_id == item.song_id)
                    .first()
                )
                favorite = {"platform": item.platform, "song_id": item.song_id}
                if cache:
                    favorite.update(cache.to_dict())
                data.append(favorite)
            return ResponseSchemas(code=200, msg="success", data=data)

    @staticmethod
    def remove_favorite_song(request: SongSchemas) -> ResponseSchemas:
        """移除喜欢歌曲

        Args:
            request (FavoriteSongSchemas): 请求参数

        Returns:
            ResponseSchemas: 响应结果
        """
        with get_session() as session:
            favorite_song = (
                session.query(FavoriteSong)
                .filter(FavoriteSong.platform == request.platform, FavoriteSong.song_id == request.song_id)
                .first()
            )
            if favorite_song:
                favorite_song.deleted_at = datetime.datetime.now(datetime.timezone.utc)
                session.commit()
                return ResponseSchemas(code=200, msg="success", data=None)
            else:
                return ResponseSchemas(code=404, msg="song not found", data=None)


class SongCacheController:
    @staticmethod
    def get_random_song_caches(limit: int = 15, platform: str = "wyy") -> ResponseSchemas:
        """从已有播放缓存中随机抽取推荐歌曲。"""
        safe_limit = max(1, min(limit, 50))
        with get_session() as session:
            song_caches = (
                session.query(SongCache)
                .filter(
                    SongCache.platform == platform,
                    SongCache.deleted_at.is_(None),
                    SongCache.song_url.is_not(None),
                )
                .order_by(func.random())
                .limit(safe_limit)
                .all()
            )
            return ResponseSchemas(
                code=200,
                msg="success",
                data=[item.to_dict() for item in song_caches],
            )

    @staticmethod
    def add_song_cache(request: SongCacheSchemas) -> ResponseSchemas:
        """创建歌曲缓存

        Args:
            request (SongCacheSchemas): 请求参数

        Returns:
            ResponseSchemas: 响应结果
        """
        with get_session() as session:
            song_cache = (
                session.query(SongCache)
                .filter(SongCache.platform == request.platform, SongCache.song_id == request.song_id)
                .first()
            )

            if not song_cache:
                song_cache = SongCache(
                    platform=request.platform,
                    song_id=request.song_id,
                    song_name=request.song_name,
                    singer_name=request.singer_name,
                    album_name=request.album_name,
                    cover_url=request.cover_url,
                    song_url=request.song_url,
                    last_played_at=request.last_played_at,
                )
                session.add(song_cache)
                message = "created"
            else:
                song_cache.song_name = request.song_name
                song_cache.singer_name = request.singer_name
                song_cache.album_name = request.album_name
                song_cache.cover_url = request.cover_url
                song_cache.song_url = request.song_url
                song_cache.last_played_at = request.last_played_at
                song_cache.deleted_at = None
                message = "updated"

            session.commit()
            return ResponseSchemas(code=200, msg=message, data=[song_cache.to_dict()])

    @staticmethod
    def get_song_cache(request: SongSchemas) -> ResponseSchemas:
        """获取歌曲缓存

        Args:
            request (SongSchemas): 请求参数

        Returns:
            ResponseSchemas: 响应结果
        """
        with get_session() as session:
            song_cache = (
                session.query(SongCache)
                .filter(SongCache.platform == request.platform, SongCache.song_id == request.song_id)
                .first()
            )
            if song_cache:
                return ResponseSchemas(code=200, msg="success", data=[song_cache.to_dict()])
            else:
                return ResponseSchemas(code=404, msg="song not found", data=None)

    @staticmethod
    def update_song_cache(request: SongSchemas) -> ResponseSchemas:
        """更新歌曲缓存。"""
        with get_session() as session:
            song_cache = (
                session.query(SongCache)
                .filter(SongCache.platform == request.platform, SongCache.song_id == request.song_id)
                .first()
            )
            if song_cache:
                song_cache.last_played_at = datetime.datetime.now(datetime.timezone.utc)
                session.commit()
                return ResponseSchemas(code=200, msg="success", data=[song_cache.to_dict()])
            return ResponseSchemas(code=404, msg="song not found", data=None)


class PlaylistCacheController:
    @staticmethod
    def get_playlist_cache(
        platform: str,
        playlist_id: int,
        max_age: datetime.timedelta | None = datetime.timedelta(days=1),
    ) -> ResponseSchemas:
        """读取未过期的歌单缓存；max_age=None 时允许读取过期缓存。"""
        with get_session() as session:
            cache = (
                session.query(PlaylistCache)
                .filter(
                    PlaylistCache.platform == platform,
                    PlaylistCache.playlist_id == playlist_id,
                    PlaylistCache.deleted_at.is_(None),
                )
                .first()
            )
            if not cache:
                return ResponseSchemas(code=404, msg="playlist cache not found", data=None)

            refreshed_at = cache.refreshed_at
            if refreshed_at.tzinfo is None:
                refreshed_at = refreshed_at.replace(tzinfo=datetime.timezone.utc)
            if max_age is not None and datetime.datetime.now(datetime.timezone.utc) - refreshed_at >= max_age:
                return ResponseSchemas(code=404, msg="playlist cache expired", data=None)

            try:
                data = json.loads(cache.playlist_data)
            except (TypeError, json.JSONDecodeError):
                return ResponseSchemas(code=404, msg="playlist cache invalid", data=None)
            return ResponseSchemas(code=200, msg="cache_hit", data=[data])

    @staticmethod
    def save_playlist_cache(platform: str, playlist_id: int, playlist_data: dict) -> ResponseSchemas:
        """创建或更新歌单缓存。"""
        now = datetime.datetime.now(datetime.timezone.utc)
        serialized = json.dumps(playlist_data, ensure_ascii=False)
        with get_session() as session:
            cache = (
                session.query(PlaylistCache)
                .filter(PlaylistCache.platform == platform, PlaylistCache.playlist_id == playlist_id)
                .first()
            )
            if cache:
                cache.playlist_data = serialized
                cache.refreshed_at = now
                cache.updated_at = now
                cache.deleted_at = None
            else:
                cache = PlaylistCache(
                    platform=platform,
                    playlist_id=playlist_id,
                    playlist_data=serialized,
                    refreshed_at=now,
                )
                session.add(cache)
            session.commit()
            return ResponseSchemas(code=200, msg="success", data=None)
