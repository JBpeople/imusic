from .auth import AuthController
from .qq_music import QqMusicController
from .song import FavoritePlaylistController, FavoriteSongController, PlaylistCacheController, SongCacheController
from .wyy_music import WyyMusicController

__all__ = [
    "AuthController",
    "FavoritePlaylistController",
    "FavoriteSongController",
    "PlaylistCacheController",
    "QqMusicController",
    "SongCacheController",
    "WyyMusicController",
]
