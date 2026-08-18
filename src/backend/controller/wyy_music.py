import os

import requests
from dotenv import load_dotenv

from src.backend.schemas import (
    ResponseSchemas,
    SongCacheSchemas,
    SongSchemas,
    WyyMusicAnalysisRequest,
    WyyMusicAnalysisResponse,
    WyyMusicLyricRequest,
    WyyMusicLyricResponse,
    WyyMusicPlaylistRequest,
    WyyMusicPlaylistResponse,
    WyyMusicSearchRequest,
    WyyMusicSearchResponse,
)

from .song import PlaylistCacheController, SongCacheController

load_dotenv()


_API = os.getenv("API")
_URL = os.getenv("URL")


class WyyMusicController:
    """网易云音乐控制器"""

    @staticmethod
    def search_music(request: WyyMusicSearchRequest) -> ResponseSchemas:
        """网易云音乐搜索

        Args:
            request (WyyMusicSearchRequest): 请求参数

        Returns:
            ResponseSchemas: 响应数据
        """
        base_url = f"{_URL}/163_search?keyword={request.keyword}&"
        if request.limit:
            base_url += f"limit={request.limit}&"
        if request.offset:
            base_url += f"offset={request.offset}&"
        if request.apikey:
            base_url += f"apikey={request.apikey}&"
        else:
            base_url += f"apikey={_API}"
        full_url = f"{base_url}"

        response = requests.get(full_url)
        payload = response.json()
        if response.status_code == 200:
            return ResponseSchemas(
                code=200,
                msg="success",
                data=[WyyMusicSearchResponse.model_validate(item) for item in payload["data"]["songs"]],
            )
        else:
            return ResponseSchemas(
                code=response.status_code,
                msg=response.json().get("msg", "error"),
                data=None,
            )

    @staticmethod
    def music_playlist(request: WyyMusicPlaylistRequest) -> ResponseSchemas:
        """获取网易云歌单详情。"""
        cached = PlaylistCacheController.get_playlist_cache("wyy", request.id)
        if cached.code == 200:
            return cached

        if not _URL or not (request.apikey or _API):
            return ResponseSchemas(code=500, msg="音乐接口配置不完整", data=None)

        try:
            response = requests.get(
                f"{_URL}/163_playlist",
                params={"id": request.id, "apikey": request.apikey or _API},
                timeout=20,
            )
            payload = response.json()
        except requests.RequestException:
            stale = PlaylistCacheController.get_playlist_cache("wyy", request.id, max_age=None)
            return stale if stale.code == 200 else ResponseSchemas(code=502, msg="歌单服务暂时不可用", data=None)
        except ValueError:
            stale = PlaylistCacheController.get_playlist_cache("wyy", request.id, max_age=None)
            return stale if stale.code == 200 else ResponseSchemas(code=502, msg="歌单服务返回了无效数据", data=None)

        if response.status_code != 200 or payload.get("code") != 200:
            return ResponseSchemas(
                code=response.status_code if response.status_code != 200 else payload.get("code", 502),
                msg=payload.get("msg", "获取歌单失败"),
                data=None,
            )

        try:
            playlist = WyyMusicPlaylistResponse.model_validate(payload["data"])
        except (KeyError, TypeError, ValueError):
            return ResponseSchemas(code=502, msg="歌单数据格式不正确", data=None)

        playlist_data = playlist.model_dump()
        PlaylistCacheController.save_playlist_cache("wyy", request.id, playlist_data)
        return ResponseSchemas(code=200, msg="refreshed", data=[playlist_data])

    @staticmethod
    def music_analysis(request: WyyMusicAnalysisRequest) -> ResponseSchemas:
        """网易云音乐信息解析

        Args:
            request (WyyMusicAnalysisRequest): 请求参数

        Returns:
            ResponseSchemas: 响应数据
        """
        cached = SongCacheController.get_song_cache(SongSchemas(platform="wyy", song_id=request.id))
        if not request.force_refresh and cached.code == 200 and cached.data:
            SongCacheController.update_song_cache(SongSchemas(platform="wyy", song_id=request.id))
            item = cached.data[0]
            return ResponseSchemas(
                code=200,
                msg="success",
                data=[
                    {
                        "id": item["song_id"],
                        "url": item["song_url"],
                        "name": item["song_name"],
                        "artist": item["singer_name"],
                        "album": item["album_name"],
                        "picUrl": item["cover_url"],
                        "cached": True,
                    }
                ],
            )

        base_url = f"{_URL}/163_music?id={request.id}&"
        if request.level:
            base_url += f"level={request.level}&"
        if request.type:
            base_url += f"type={request.type}&"
        if request.apikey:
            base_url += f"apikey={request.apikey}&"
        else:
            base_url += f"apikey={_API}"
        full_url = f"{base_url}"

        response = requests.get(full_url)
        payload = response.json()
        if response.status_code == 200:
            SongCacheController.add_song_cache(
                SongCacheSchemas(
                    platform="wyy",
                    song_id=payload["data"]["id"],
                    song_name=payload["data"]["name"],
                    singer_name=payload["data"]["artist"],
                    album_name=payload["data"]["album"],
                    cover_url=payload["data"]["picUrl"],
                    song_url=payload["data"]["url"],
                )
            )
            data = payload["data"]
            data["cached"] = False
            return ResponseSchemas(code=200, msg="success", data=[data])
        else:
            return ResponseSchemas(
                code=response.status_code,
                msg=response.json().get("msg", "error"),
                data=None,
            )

    @staticmethod
    def music_lyric(request: WyyMusicLyricRequest) -> ResponseSchemas:
        """网易云音乐歌词解析

        Args:
            request (WyyMusicLyricRequest): 请求参数

        Returns:
            ResponseSchemas: 响应数据
        """
        cached = SongCacheController.get_song_lyrics(SongSchemas(platform="wyy", song_id=request.id))
        if cached.code == 200:
            return cached

        if not _URL or not (request.apikey or _API):
            return ResponseSchemas(code=500, msg="音乐接口配置不完整", data=None)

        try:
            response = requests.get(
                f"{_URL}/163_lyric",
                params={"id": request.id, "apikey": request.apikey or _API},
                timeout=20,
            )
            payload = response.json()
        except requests.RequestException:
            return ResponseSchemas(code=502, msg="歌词服务暂时不可用", data=None)
        except ValueError:
            return ResponseSchemas(code=502, msg="歌词服务返回了无效数据", data=None)

        if response.status_code != 200 or payload.get("code") != 200:
            return ResponseSchemas(
                code=response.status_code if response.status_code != 200 else payload.get("code", 502),
                msg=payload.get("msg", "获取歌词失败"),
                data=None,
            )

        try:
            lyrics = WyyMusicLyricResponse.model_validate(payload["data"]).model_dump()
        except (KeyError, TypeError, ValueError):
            return ResponseSchemas(code=502, msg="歌词数据格式不正确", data=None)

        SongCacheController.save_song_lyrics("wyy", request.id, lyrics)
        return ResponseSchemas(code=200, msg="refreshed", data=[lyrics])
