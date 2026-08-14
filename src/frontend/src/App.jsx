import { useEffect, useMemo, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  Compass,
  GearSix,
  Heart,
  ListNumbers,
  MagnifyingGlass,
  MusicNoteSimple,
  Pause,
  Play,
  Queue,
  SpeakerHigh,
  SpeakerSlash,
  SpinnerGap,
  SkipBack,
  SkipForward,
  Shuffle,
  X,
} from "@phosphor-icons/react";

const API = "/api/v1/wyy_music";
const SONG_API = "/api/v1/song";
const RECENT_KEY = "imusic_recent_searches";
const PLAY_MODE_KEY = "imusic_play_mode";
const PAGE_SIZE = 15;
const fallbackSongs = [
  { id: 1859245776, name: "夜曲", artists: "周杰伦", album: "十一月的萧邦", picUrl: "" },
  { id: 1858099441, name: "晴天", artists: "周杰伦", album: "叶惠美", picUrl: "" },
  { id: 1475596788, name: "告白气球", artists: "周杰伦", album: "周杰伦的床边故事", picUrl: "" },
  { id: 1330348068, name: "十年", artists: "陈奕迅", album: "黑白灰", picUrl: "" },
  { id: 1824020871, name: "孤勇者", artists: "陈奕迅", album: "孤勇者", picUrl: "" },
  { id: 1891469546, name: "修炼爱情", artists: "林俊杰", album: "因你而在", picUrl: "" },
];

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
};

const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  catch { return []; }
};

function Artwork({ song, size = 48 }) {
  if (song?.picUrl) {
    return <img className="artwork" src={song.picUrl} alt={`${song.album}封面`} style={{ width: size, height: size }} />;
  }
  return (
    <div className="artwork artwork-fallback" style={{ width: size, height: size }} aria-hidden="true">
      <MusicNoteSimple size={size * 0.42} weight="fill" />
    </div>
  );
}

export function App() {
  const audioRef = useRef(null);
  const resultsRef = useRef(null);
  const refreshingAudioRef = useRef(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("discover");
  const [searchedKeyword, setSearchedKeyword] = useState("");
  const [songs, setSongs] = useState(fallbackSongs);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [favoritePage, setFavoritePage] = useState(1);
  const [favoriteHasNextPage, setFavoriteHasNextPage] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [muted, setMuted] = useState(false);
  const [playMode, setPlayMode] = useState(() => localStorage.getItem(PLAY_MODE_KEY) === "shuffle" ? "shuffle" : "sequence");
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState(null);

  const resultLabel = useMemo(() => searchedKeyword ? `“${searchedKeyword}”的搜索结果` : "推荐歌曲", [searchedKeyword]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  const loadFavorites = async ({ showList = false, targetPage = 1 } = {}) => {
    if (showList) {
      setView("favorites");
      setLoading(true);
      setError("");
    }
    try {
      const response = await fetch(`${SONG_API}/favorite_songs?limit=${PAGE_SIZE + 1}&offset=${(targetPage - 1) * PAGE_SIZE}`);
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "获取喜欢歌曲失败");
      const items = payload.data || [];
      const pageItems = items.slice(0, PAGE_SIZE);
      setFavorites((previous) => {
        const next = new Set(previous);
        pageItems.forEach((item) => next.add(`${item.platform}:${item.song_id}`));
        return next;
      });
      if (showList) {
        setSearchedKeyword("");
        setHasNextPage(false);
        setFavoritePage(targetPage);
        setFavoriteHasNextPage(items.length > PAGE_SIZE);
        setSongs(pageItems.filter((item) => item.song_url).map((item) => ({
          id: item.song_id,
          name: item.song_name,
          artists: item.singer_name,
          album: item.album_name,
          picUrl: item.cover_url,
          url: item.song_url,
          cached: true,
        })));
      }
    } catch (reason) {
      setError(reason.message || "获取喜欢歌曲失败");
    } finally {
      if (showList) setLoading(false);
    }
  };

  const goToFavoritePage = async (targetPage) => {
    if (targetPage < 1 || loading) return;
    await loadFavorites({ showList: true, targetPage });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const mapCacheSong = (item) => ({
    id: item.song_id,
    name: item.song_name,
    artists: item.singer_name,
    album: item.album_name,
    picUrl: item.cover_url,
    url: item.song_url,
    cached: true,
  });

  const loadRecommendations = async (targetView = "discover") => {
    setView(targetView);
    setSearchedKeyword("");
    setHasNextPage(false);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${SONG_API}/song_caches/recommendations?platform=wyy&limit=${PAGE_SIZE}`);
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "获取推荐歌曲失败");
      setSongs((payload.data || []).map(mapCacheSong));
    } catch (reason) {
      setSongs([]);
      setError(reason.message || "获取推荐歌曲失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
    loadRecommendations("discover");
  }, []);

  const saveRecent = (keyword) => {
    const next = [keyword, ...recent.filter((item) => item !== keyword)].slice(0, 7);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const loadPage = async (keyword, targetPage, { saveHistory = false } = {}) => {
    const value = keyword.trim();
    if (!value) return;
    setQuery(value);
    setView("netease");
    setSearchedKeyword(value);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/music_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: value,
          limit: PAGE_SIZE + 1,
          offset: (targetPage - 1) * PAGE_SIZE,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "搜索失败");
      const nextSongs = payload.data || [];
      setSongs(nextSongs.slice(0, PAGE_SIZE));
      setHasNextPage(nextSongs.length > PAGE_SIZE);
      setPage(targetPage);
      if (saveHistory) saveRecent(value);
    } catch (reason) {
      setSongs([]);
      setHasNextPage(false);
      setError(reason.message || "暂时无法搜索，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const search = async (event, keyword = query) => {
    event?.preventDefault?.();
    await loadPage(keyword, 1, { saveHistory: true });
  };

  const goToPage = async (targetPage) => {
    if (!searchedKeyword || targetPage < 1 || loading) return;
    await loadPage(searchedKeyword, targetPage);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const requestFreshSong = async (song) => {
    const response = await fetch(`${API}/music_analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: song.id,
        level: "exhigh",
        type: "json",
        force_refresh: true,
      }),
    });
    const payload = await response.json();
    const detail = payload?.data?.[0];
    if (!response.ok || payload.code !== 200 || !detail?.url) {
      throw new Error(payload.msg || "播放地址刷新失败");
    }
    return detail;
  };

  const refreshAndPlay = async (song) => {
    if (!song || refreshingAudioRef.current) return;
    refreshingAudioRef.current = true;
    setResolvingId(song.id);
    try {
      const detail = await requestFreshSong(song);
      const resolved = {
        ...song,
        ...detail,
        artists: detail.artist || song.artists,
        cached: false,
      };
      setCurrent(resolved);
      audioRef.current.src = detail.url;
      await audioRef.current.play();
      setError("");
    } finally {
      refreshingAudioRef.current = false;
      setResolvingId(null);
    }
  };

  const handleAudioError = async () => {
    if (!current || refreshingAudioRef.current) return;
    if (!current.cached) {
      setError("新的播放地址仍无法加载，请稍后重试");
      return;
    }
    try {
      await refreshAndPlay(current);
    } catch (reason) {
      setError(reason.message || "缓存地址已失效，重新解析失败");
    }
  };

  const playSong = async (song) => {
    const audio = audioRef.current;
    if (current?.id === song.id && audio?.src) {
      if (audio.paused) await audio.play(); else audio.pause();
      return;
    }
    setResolvingId(song.id);
    setError("");
    try {
      let detail;
      const cacheResponse = await fetch(`${SONG_API}/song_cache?platform=wyy&song_id=${song.id}`);
      const cachePayload = await cacheResponse.json();
      if (cacheResponse.ok && cachePayload.code === 200 && cachePayload.data?.[0]?.song_url) {
        const cached = cachePayload.data[0];
        detail = {
          id: cached.song_id,
          url: cached.song_url,
          name: cached.song_name,
          artist: cached.singer_name,
          album: cached.album_name,
          picUrl: cached.cover_url,
          cached: true,
        };
        fetch(`${SONG_API}/song_cache`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "wyy", song_id: song.id }),
        }).catch(() => {});
      } else {
        const response = await fetch(`${API}/music_analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: song.id, level: "exhigh", type: "json" }),
        });
        const payload = await response.json();
        detail = payload?.data?.[0];
        if (!response.ok || payload.code !== 200 || !detail?.url) throw new Error(payload.msg || "暂时无法播放这首歌");
      }
      const resolved = { ...song, ...detail, artists: detail.artist || song.artists };
      setCurrent(resolved);
      audio.src = detail.url;
      try {
        await audio.play();
      } catch (playError) {
        if (!detail.cached) throw playError;
        await refreshAndPlay(resolved);
      }
    } catch (reason) {
      setError(reason.message || "播放地址获取失败");
    } finally {
      setResolvingId(null);
    }
  };

  const toggleFavorite = async (event, song) => {
    event?.stopPropagation?.();
    if (!song) return;
    const key = `wyy:${song.id}`;
    const liked = favorites.has(key);
    setFavoriteLoading(song.id);
    try {
      if (!liked) {
        const cacheResponse = await fetch(`${SONG_API}/song_cache?platform=wyy&song_id=${song.id}`);
        const cachePayload = await cacheResponse.json();
        if (!cacheResponse.ok || cachePayload.code !== 200) {
          const analysisResponse = await fetch(`${API}/music_analysis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: song.id, level: "exhigh", type: "json" }),
          });
          const analysisPayload = await analysisResponse.json();
          if (!analysisResponse.ok || analysisPayload.code !== 200) {
            throw new Error(analysisPayload.msg || "歌曲缓存创建失败");
          }
        }
      }
      const response = await fetch(`${SONG_API}/favorite_song`, {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "wyy", song_id: song.id }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "操作失败");
      setFavorites((previous) => {
        const next = new Set(previous);
        if (liked) next.delete(key); else next.add(key);
        return next;
      });
      if (view === "favorites" && liked) {
        const targetPage = songs.length === 1 && favoritePage > 1 ? favoritePage - 1 : favoritePage;
        await loadFavorites({ showList: true, targetPage });
      }
    } catch (reason) {
      setError(reason.message || "喜欢状态更新失败");
    } finally {
      setFavoriteLoading(null);
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!current) {
      if (songs[0]) await playSong(songs[0]);
      return;
    }
    if (audio.paused) await audio.play(); else audio.pause();
  };

  const togglePlayMode = () => {
    const nextMode = playMode === "sequence" ? "shuffle" : "sequence";
    setPlayMode(nextMode);
    localStorage.setItem(PLAY_MODE_KEY, nextMode);
  };

  const stepSong = (delta) => {
    if (!songs.length) return;
    const foundIndex = songs.findIndex((song) => song.id === current?.id);
    const index = foundIndex >= 0 ? foundIndex : 0;

    if (playMode === "shuffle") {
      if (songs.length === 1) {
        playSong(songs[0]);
        return;
      }
      let randomIndex = index;
      while (randomIndex === index) randomIndex = Math.floor(Math.random() * songs.length);
      playSong(songs[randomIndex]);
      return;
    }

    const nextIndex = index + delta;
    if (nextIndex < 0) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    if (nextIndex >= songs.length) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    playSong(songs[nextIndex]);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="wordmark">iMusic</div>
        <nav aria-label="音乐来源">
          <button className={`nav-item ${view === "discover" ? "active" : ""}`} onClick={() => loadRecommendations("discover")}><Compass size={24} weight="regular" /><span>发现</span></button>
          <button className={`nav-item ${view === "favorites" ? "active" : ""}`} onClick={() => loadFavorites({ showList: true, targetPage: 1 })}><Heart size={24} weight={view === "favorites" ? "fill" : "regular"} /><span>我喜欢</span></button>
          <button className={`nav-item source-link ${view === "netease" ? "active" : ""}`} onClick={() => loadRecommendations("netease")}><span className="source-icon"><MusicNoteSimple size={17} weight="fill" /></span><span>网易云音乐</span></button>
          <button className="nav-item disabled" disabled><span className="source-icon ghost"><MusicNoteSimple size={17} weight="fill" /></span><span>QQ音乐 · 开发中</span></button>
        </nav>
        <button className="settings"><GearSix size={23} /><span>设置</span></button>
      </aside>

      <main className="content">
        <form className="search-box" onSubmit={search}>
          {loading ? <SpinnerGap className="spin" size={23} /> : <MagnifyingGlass size={23} />}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索歌曲、歌手或专辑" aria-label="搜索歌曲、歌手或专辑" />
          {query && <button type="button" className="clear-query" onClick={() => setQuery("")} aria-label="清空搜索"><X size={18} /></button>}
        </form>

        <section className="heading-block">
          <h1>搜索音乐</h1>
          <div className="recent-heading"><h2>最近搜索</h2>{recent.length > 0 && <button onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}>清除记录</button>}</div>
          <div className="recent-list">
            {(recent.length ? recent : ["周杰伦", "晴天", "告白气球", "陈奕迅", "孤勇者", "夜曲", "林俊杰"]).map((item) => (
              <button key={item} onClick={(e) => search(e, item)}>{item}</button>
            ))}
          </div>
        </section>

        <section className="results" aria-live="polite" ref={resultsRef}>
          <div className="results-title"><h2>{view === "favorites" ? "我喜欢的音乐" : resultLabel}</h2>{loading && <span>{searchedKeyword ? "正在搜索…" : "正在加载推荐…"}</span>}</div>
          <div className="table-head"><span>歌曲</span><span>歌手</span><span>专辑</span><span /></div>
          {error && <div className="message error"><span>{error}</span><button onClick={() => loadPage(searchedKeyword || query, page)}>重试</button></div>}
          {!loading && !error && songs.length === 0 && <div className="message"><MusicNoteSimple size={30} /><strong>{view === "favorites" ? "还没有喜欢的歌曲" : searchedKeyword ? "没有找到相关歌曲" : "还没有可推荐的缓存歌曲"}</strong><span>{searchedKeyword ? "试试歌手名或更短的关键词" : "播放或收藏歌曲后，这里会出现推荐"}</span></div>}
          <div className={`song-list ${loading ? "loading-list" : ""}`}>
            {songs.map((song) => {
              const selected = current?.id === song.id;
              const busy = resolvingId === song.id;
              return (
                <div className={`song-row ${selected ? "selected" : ""}`} key={song.id} role="button" tabIndex="0" onDoubleClick={() => playSong(song)} onClick={() => playSong(song)} onKeyDown={(event) => { if (event.key === "Enter") playSong(song); }}>
                  <span className="song-cell">
                    <span className="row-action">{busy ? <SpinnerGap className="spin" size={18} /> : selected && playing ? <span className="playing-bars"><i /><i /><i /></span> : <Play size={16} weight="fill" />}</span>
                    <Artwork song={song} />
                    <span className="song-name">{song.name}</span>
                  </span>
                  <span className="truncate">{song.artists}</span>
                  <span className="truncate album">{song.album}</span>
                  <button className={`favorite-button ${favorites.has(`wyy:${song.id}`) ? "liked" : ""}`} onClick={(event) => toggleFavorite(event, song)} aria-label={favorites.has(`wyy:${song.id}`) ? "取消喜欢" : "添加喜欢"} disabled={favoriteLoading === song.id}>
                    {favoriteLoading === song.id ? <SpinnerGap className="spin" size={20} /> : <Heart size={21} weight={favorites.has(`wyy:${song.id}`) ? "fill" : "regular"} />}
                  </button>
                </div>
              );
            })}
          </div>
          {view === "netease" && searchedKeyword && !error && songs.length > 0 && (
            <nav className="pagination" aria-label="搜索结果分页">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1 || loading}>
                <CaretLeft size={17} weight="bold" />
                上一页
              </button>
              <span>第 {page} 页</span>
              <button onClick={() => goToPage(page + 1)} disabled={!hasNextPage || loading}>
                下一页
                <CaretRight size={17} weight="bold" />
              </button>
            </nav>
          )}
          {view === "favorites" && !error && songs.length > 0 && (
            <nav className="pagination" aria-label="喜欢音乐分页">
              <button onClick={() => goToFavoritePage(favoritePage - 1)} disabled={favoritePage === 1 || loading}>
                <CaretLeft size={17} weight="bold" />
                上一页
              </button>
              <span>第 {favoritePage} 页</span>
              <button onClick={() => goToFavoritePage(favoritePage + 1)} disabled={!favoriteHasNextPage || loading}>
                下一页
                <CaretRight size={17} weight="bold" />
              </button>
            </nav>
          )}
        </section>
      </main>

      <footer className={`player ${current ? "has-track" : ""}`}>
        <div className="track-meta">
          <Artwork song={current} size={62} />
          <div><strong>{current?.name || "还没有播放歌曲"}</strong><span>{current?.artists || "从搜索结果中选择一首歌"}</span></div>
          {current && <button className={`player-favorite ${favorites.has(`wyy:${current.id}`) ? "liked" : ""}`} onClick={(event) => toggleFavorite(event, current)} aria-label={favorites.has(`wyy:${current.id}`) ? "取消喜欢" : "添加喜欢"}><Heart size={21} weight={favorites.has(`wyy:${current.id}`) ? "fill" : "regular"} /></button>}
        </div>
        <div className="transport">
          <button className={`mode-button ${playMode === "shuffle" ? "active" : ""}`} onClick={togglePlayMode} aria-label={playMode === "sequence" ? "当前为顺序播放，点击切换随机播放" : "当前为随机播放，点击切换顺序播放"} title={playMode === "sequence" ? "顺序播放" : "随机播放"}>
            {playMode === "shuffle" ? <Shuffle size={22} weight="bold" /> : <ListNumbers size={22} weight="bold" />}
          </button>
          <button onClick={() => stepSong(-1)} aria-label="上一首" disabled={!current}><SkipBack size={25} weight="fill" /></button>
          <button className="main-play" onClick={togglePlayback} aria-label={playing ? "暂停" : "播放"}>{playing ? <Pause size={27} weight="fill" /> : <Play size={27} weight="fill" />}</button>
          <button onClick={() => stepSong(1)} aria-label="下一首" disabled={!current}><SkipForward size={25} weight="fill" /></button>
        </div>
        <div className="timeline"><span>{formatTime(time)}</span><input type="range" min="0" max={duration || 0} value={time} onChange={(e) => { audioRef.current.currentTime = Number(e.target.value); }} style={{ "--progress": `${duration ? (time / duration) * 100 : 0}%` }} /><span>{formatTime(duration)}</span></div>
        <div className="volume"><button onClick={() => setMuted(!muted)} aria-label={muted ? "取消静音" : "静音"}>{muted ? <SpeakerSlash size={22} /> : <SpeakerHigh size={22} />}</button><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ "--progress": `${volume * 100}%` }} /></div>
        <button className="lyrics" title="歌词功能即将开放"><Queue size={24} /><span>歌词</span></button>
      </footer>

      <audio ref={audioRef} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={handleAudioError} onEnded={() => stepSong(1)} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
    </div>
  );
}
