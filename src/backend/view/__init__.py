from .auth import auth_router, require_user
from .song import song_router
from .wyy_music import wyy_music_router

__all__ = ["auth_router", "require_user", "song_router", "wyy_music_router"]
