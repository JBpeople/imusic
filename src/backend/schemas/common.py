import datetime
from typing import Any

from pydantic import BaseModel, Field


class ResponseSchemas(BaseModel):
    code: int = Field(..., description="响应状态码")
    msg: str = Field(..., description="响应消息")
    data: Any | None = Field(default=None, description="响应数据")


class SongSchemas(BaseModel):
    platform: str = Field(..., description="歌曲平台")
    song_id: int = Field(..., description="歌曲ID")


class SongCacheSchemas(BaseModel):
    platform: str = Field(..., description="歌曲平台")
    song_id: int = Field(..., description="歌曲ID")
    song_name: str | None = Field(default=None, description="歌曲名称")
    singer_name: str | None = Field(default=None, description="歌手名称")
    album_name: str | None = Field(default=None, description="专辑名称")
    cover_url: str | None = Field(default=None, description="封面图片URL")
    song_url: str = Field(..., description="歌曲URL")
    last_played_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc),
        description="最后播放时间",
    )
