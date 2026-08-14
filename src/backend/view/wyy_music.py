from fastapi import APIRouter

from src.backend.controller import WyyMusicController
from src.backend.schemas import ResponseSchemas, WyyMusicAnalysisRequest, WyyMusicLyricRequest, WyyMusicSearchRequest

wyy_music_router = APIRouter(prefix="/api/v1/wyy_music", tags=["网易云音乐"])


@wyy_music_router.post("/music_search", summary="网易云音乐搜索")
def music_search(request: WyyMusicSearchRequest) -> ResponseSchemas:
    """网易云音乐搜索

    Args:
        request (WyyMusicSearchRequest): 请求参数

    Returns:
        ResponseSchemas: 响应数据
    """
    return WyyMusicController.search_music(request)


@wyy_music_router.post("/music_analysis", summary="网易云音乐信息解析")
def music_analysis(request: WyyMusicAnalysisRequest) -> ResponseSchemas:
    """网易云音乐信息解析

    Args:
        request (WyyMusicAnalysisRequest): 请求参数

    Returns:
        ResponseSchemas: 响应数据
    """
    return WyyMusicController.music_analysis(request)


@wyy_music_router.post("/music_lyric", summary="网易云音乐歌词获取")
def music_lyric(request: WyyMusicLyricRequest) -> ResponseSchemas:
    """网易云音乐歌词获取

    Args:
        request (WyyMusicAnalysisRequest): 请求参数

    Returns:
        ResponseSchemas: 响应数据
    """
    return WyyMusicController.music_lyric(request)
