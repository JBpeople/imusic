from .auth import LoginRequest, PasswordResetRequest, UserCreateRequest, UserStatusRequest
from .common import PlaylistSchemas, ResponseSchemas, SongCacheSchemas, SongSchemas
from .qq_music import QqMusicSearchRequest
from .wyy_music import (
    WyyMusicAnalysisRequest,
    WyyMusicAnalysisResponse,
    WyyMusicLyricRequest,
    WyyMusicLyricResponse,
    WyyMusicPlaylistRequest,
    WyyMusicPlaylistResponse,
    WyyMusicSearchRequest,
    WyyMusicSearchResponse,
)

__all__ = [
    "QqMusicSearchRequest",
    "LoginRequest",
    "PasswordResetRequest",
    "PlaylistSchemas",
    "ResponseSchemas",
    "SongCacheSchemas",
    "SongSchemas",
    "UserCreateRequest",
    "UserStatusRequest",
    "WyyMusicAnalysisRequest",
    "WyyMusicAnalysisResponse",
    "WyyMusicLyricRequest",
    "WyyMusicLyricResponse",
    "WyyMusicPlaylistRequest",
    "WyyMusicPlaylistResponse",
    "WyyMusicSearchRequest",
    "WyyMusicSearchResponse",
]
