from pydantic import BaseModel, Field


class WyyMusicSearchRequest(BaseModel):
    keyword: str = Field(..., description="搜索关键词")
    limit: int | None = Field(default=100, description="搜索结果数量限制，默认 100")
    offset: int | None = Field(default=0, description="搜索结果偏移量，默认 0")
    apikey: str | None = Field(default=None, description="登录用户的个人 API 密钥")


class WyyMusicSearchResponse(BaseModel):
    id: int = Field(..., description="网易云歌曲ID (例如: 1315196858)")
    name: str = Field(..., description="歌曲名称")
    artists: str = Field(..., description="歌手名称")
    album: str = Field(..., description="专辑名称")
    picUrl: str = Field(..., description="专辑封面图片地址")


class WyyMusicAnalysisRequest(BaseModel):
    id: int = Field(..., description="网易云歌曲ID (例如: 1315196858)")
    level: str | None = Field(
        default=None,
        description="音质等级，默认 jymaster (可选值: standard, exhigh, lossless, hires, jymaster, sky, jyeffect)",
    )
    type: str | None = Field(default=None, description="返回类型，默认 json (可选值: json, text, down)")
    apikey: str | None = Field(default=None, description="登录用户的个人 API 密钥")
    force_refresh: bool = Field(default=False, description="是否跳过缓存并重新解析播放地址")


class WyyMusicAnalysisResponse(BaseModel):
    id: int = Field(..., description="网易云歌曲ID (例如: 1315196858)")
    url: str = Field(..., description="歌曲播放地址")
    br: int = Field(..., description="音质码率")
    level: str = Field(..., description="音质等级")
    size: int = Field(..., description="文件大小")
    md5: str = Field(..., description="文件 MD5 值")
    name: str = Field(..., description="歌曲名称")
    artist: str = Field(..., description="歌手名称")
    album: str = Field(..., description="专辑名称")
    picUrl: str = Field(..., description="专辑封面图片地址")


class WyyMusicLyricRequest(BaseModel):
    id: int = Field(..., description="网易云歌曲ID (例如: 1315196858)")
    apikey: str | None = Field(default=None, description="登录用户的个人 API 密钥")


class WyyMusicLyricResponse(BaseModel):
    lrc: str = Field(..., description="歌词内容")
    tlyric: str | None = Field(default=None, description="翻译歌词内容")
    romalrc: str | None = Field(default=None, description="罗马拼音歌词内容")
    klyric: str | None = Field(default=None, description="卡拉OK歌词内容")
