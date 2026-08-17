from fastapi import APIRouter

from src.backend.controller import FavoritePlaylistController, FavoriteSongController, SongCacheController
from src.backend.schemas import PlaylistSchemas, ResponseSchemas, SongCacheSchemas, SongSchemas

song_router = APIRouter(prefix="/api/v1/song", tags=["音乐管理"])


@song_router.post("/favorite_playlist", summary="添加收藏歌单")
def add_favorite_playlist(request: PlaylistSchemas) -> ResponseSchemas:
    return FavoritePlaylistController.add_favorite_playlist(request)


@song_router.get("/favorite_playlists", summary="获取收藏歌单列表")
def get_favorite_playlists(platform: str = "wyy") -> ResponseSchemas:
    return FavoritePlaylistController.get_favorite_playlists(platform=platform)


@song_router.delete("/favorite_playlist", summary="删除收藏歌单")
def remove_favorite_playlist(request: PlaylistSchemas) -> ResponseSchemas:
    return FavoritePlaylistController.remove_favorite_playlist(request)


@song_router.post("/favorite_song", summary="添加喜欢歌曲")
def add_favorite_song(request: SongSchemas) -> ResponseSchemas:
    """添加喜欢歌曲

    Args:
        request (FavoriteSongSchemas): 请求参数

    Returns:
        ResponseSchemas: 响应结果
    """
    return FavoriteSongController.add_favorite_song(request)


@song_router.get("/favorite_songs", summary="获取喜欢歌曲列表")
def get_favorite_songs(limit: int = 15, offset: int = 0) -> ResponseSchemas:
    """获取喜欢歌曲列表

    Returns:
        ResponseSchemas: 响应结果
    """
    return FavoriteSongController.get_favorite_songs(limit=limit, offset=offset)


@song_router.delete("/favorite_song", summary="移除喜欢歌曲")
def remove_favorite_song(request: SongSchemas) -> ResponseSchemas:
    """移除喜欢歌曲

    Args:
        request (FavoriteSongSchemas): 请求参数

    Returns:
        ResponseSchemas: 响应结果
    """
    return FavoriteSongController.remove_favorite_song(request)


@song_router.post("/song_cache", summary="添加歌曲缓存")
def add_song_cache(request: SongCacheSchemas) -> ResponseSchemas:
    """添加歌曲缓存

    Args:
        request (SongCacheSchemas): 请求参数

    Returns:
        ResponseSchemas: 响应结果
    """
    return SongCacheController.add_song_cache(request)


@song_router.get("/song_caches/recommendations", summary="随机获取缓存歌曲推荐")
def get_recommended_song_caches(limit: int = 15, platform: str = "wyy") -> ResponseSchemas:
    return SongCacheController.get_random_song_caches(limit=limit, platform=platform)


@song_router.get("/song_cache", summary="获取歌曲缓存")
def get_song_cache(platform: str, song_id: int) -> ResponseSchemas:
    """获取歌曲缓存

    Args:
        request (SongSchemas): 请求参数

    Returns:
        ResponseSchemas: 响应结果
    """
    return SongCacheController.get_song_cache(SongSchemas(platform=platform, song_id=song_id))


@song_router.put("/song_cache", summary="更新歌曲缓存")
def update_song_cache(request: SongSchemas) -> ResponseSchemas:
    """更新歌曲缓存

    Args:
        request (SongCacheSchemas): 请求参数

    Returns:
        ResponseSchemas: 响应结果
    """
    return SongCacheController.update_song_cache(request)
