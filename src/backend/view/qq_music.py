from fastapi import APIRouter

from src.backend.controller import QqMusicController
from src.backend.schemas import QqMusicSearchRequest

qq_music_router = APIRouter(prefix="/api/v1/qq_music", tags=["QQ`音乐"])


@qq_music_router.post("/music_search", summary="QQ音乐搜索")
def music_search(request: QqMusicSearchRequest) -> dict:
    """QQ音乐搜索

    Returns:
        ResponseSchemas: 响应数据
    """
    return QqMusicController.search_music(request)
