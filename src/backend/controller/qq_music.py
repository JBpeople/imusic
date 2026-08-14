import os

import requests
from dotenv import load_dotenv

from src.backend.schemas import QqMusicSearchRequest, ResponseSchemas

load_dotenv()


_API = os.getenv("API")
_URL = os.getenv("URL")


class QqMusicController:
    @staticmethod
    def search_music(request: QqMusicSearchRequest) -> dict:
        """QQ音乐搜索

        Args:
            request (QqMusicSearchRequest): QQ音乐搜索请求参数

        Returns:
            dict: 响应数据
        """
        if not request.mid and not request.msg:
            return ResponseSchemas(
                code=400,
                msg="参数错误：未传 mid 时必须提供 msg",
                data=None,
            )

        base_url = f"{_URL}/qq_music?keyword={request.keyword}&"
        if request.msg:
            base_url += f"msg={request.msg}&"
        if request.mid:
            base_url += f"mid={request.mid}&"
        if request.n:
            base_url += f"n={request.n}&"
        if request.num:
            base_url += f"num={request.num}&"
        if request.g:
            base_url += f"g={request.g}&"
        if request.size:
            base_url += f"size={request.size}&"
        if request.cookie:
            base_url += f"cookie={request.cookie}&"
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
