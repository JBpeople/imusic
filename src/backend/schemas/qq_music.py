from pydantic import BaseModel, Field


class QqMusicSearchRequest(BaseModel):
    msg: str | None = Field(default=None, description="歌曲名或搜索关键词；未传 mid 时必须提供")
    mid: str | None = Field(default=None, description="QQ 音乐歌曲 mid；传入后直接解析，并忽略 msg、n、num")
    n: int | None = Field(default=1, description="选择搜索结果序号，范围 1～50；不传则返回列表")
    num: int | None = Field(default=10, description="搜索返回数量，范围 1～50")
    g: int | None = Field(default=None, description="搜索返回数量，范围 1～50；与 num 等价")
    size: str | None = Field(
        default=None, description="原生音质：128k、320k、flac、hires、master；默认 flac，服务端不做别名或降级映射"
    )
    cookie: str | None = Field(default=None, description="兼容旧调用保留，当前音乐源不会使用或转发该值")
    type: str | None = Field(default=None, description="json 或 text，默认 json")
    apikey: str | None = Field(default=None, description="登录用户的个人 API 密钥")
