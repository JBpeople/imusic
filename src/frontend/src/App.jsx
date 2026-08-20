import { useEffect, useMemo, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  Compass,
  Heart,
  Key,
  ListNumbers,
  MagnifyingGlass,
  MusicNoteSimple,
  Pause,
  Play,
  Plus,
  Queue,
  SpeakerHigh,
  SpeakerSlash,
  SpinnerGap,
  SkipBack,
  SkipForward,
  Shuffle,
  ShieldCheck,
  SignOut,
  Trophy,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";

const API = "/api/v1/wyy_music";
const SONG_API = "/api/v1/song";
const AUTH_API = "/api/v1/auth";
const RECENT_KEY = "imusic_recent_searches";
const PLAY_MODE_KEY = "imusic_play_mode";
const isIphoneSafari = () => {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPod/.test(navigator.userAgent)
    && /WebKit/.test(navigator.userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
};
const PLAYLISTS = {
  hotlist: { id: 3778678, name: "热歌榜" },
  soaring: { id: 19723756, name: "飙升榜" },
  newchart: { id: 3779629, name: "新歌榜" },
};
const PLAYLIST_COLLECTIONS = {
  rankings: {
    title: "排行榜",
    description: "查看网易云音乐的热门、新歌与飙升趋势",
    keys: ["hotlist", "soaring", "newchart"],
  },
  playlists: {
    title: "我的歌单",
    description: "收藏的歌单都在这里，点开后查看全部歌曲",
    keys: [],
  },
};
const PAGE_SIZE = 15;
const savedPlaylistKey = (id) => `saved-${id}`;
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

const getLyricText = (value) => {
  if (typeof value === "string") return value;
  return typeof value?.lyric === "string" ? value.lyric : "";
};

const parseLrc = (source) => {
  const lines = [];
  getLyricText(source).split(/\r?\n/).forEach((line) => {
    const timestamps = [...line.matchAll(/\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/g)];
    if (!timestamps.length) return;
    const text = line.replace(/\[[^\]]+\]/g, "").trim();
    timestamps.forEach((match) => {
      lines.push({ time: Number(match[1]) * 60 + Number(match[2]), text });
    });
  });
  return lines.sort((a, b) => a.time - b.time);
};

const combineLyrics = (original, translated) => {
  const translationMap = new Map(parseLrc(translated).map((line) => [line.time.toFixed(2), line.text]));
  return parseLrc(original)
    .filter((line) => line.text)
    .map((line) => ({ ...line, translation: translationMap.get(line.time.toFixed(2)) || "" }));
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

function AuthScreen({ setupRequired, onAuthenticated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const response = await fetch(`${AUTH_API}/${setupRequired ? "setup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "登录失败");
      onAuthenticated(payload.data?.[0]);
    } catch (reason) {
      setAuthError(reason.message || "暂时无法登录");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><MusicNoteSimple size={26} weight="fill" /><span>iMusic</span></div>
        <div className="auth-copy">
          <span>{setupRequired ? "首次使用" : "欢迎回来"}</span>
          <h1>{setupRequired ? "创建管理员账号" : "登录 iMusic"}</h1>
          <p>{setupRequired ? "当前账号将负责管理其他用户，现有收藏会自动归到该账号。" : "登录后继续访问你的音乐、收藏歌单和喜欢列表。"}</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>账号<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="3–64 位字母、数字或 _.-" minLength={3} required /></label>
          <label>密码<input type="password" autoComplete={setupRequired ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" minLength={8} required /></label>
          {authError && <div className="auth-error">{authError}</div>}
          <button type="submit" disabled={busy || username.trim().length < 3 || password.length < 8}>{busy && <SpinnerGap className="spin" size={18} />}{setupRequired ? "创建并进入" : "登录"}</button>
        </form>
      </section>
    </main>
  );
}

export function App() {
  const audioRef = useRef(null);
  const resultsRef = useRef(null);
  const lyricLineRefs = useRef([]);
  const lyricCacheRef = useRef(new Map());
  const refreshingAudioRef = useRef(false);
  const playbackQueueRef = useRef([]);
  const playbackSourceRef = useRef(null);
  const preparedSongDetailsRef = useRef(new Map());
  const preparingSongIdsRef = useRef(new Set());
  const preparedNextSongRef = useRef(null);
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
  const [playlistName, setPlaylistName] = useState("热歌榜");
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistStore, setPlaylistStore] = useState({});
  const [playlistCollectionError, setPlaylistCollectionError] = useState("");
  const [playlistOrigin, setPlaylistOrigin] = useState("rankings");
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [playlistIdInput, setPlaylistIdInput] = useState("");
  const [playlistMutationLoading, setPlaylistMutationLoading] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricLines, setLyricLines] = useState([]);
  const [lyricLoading, setLyricLoading] = useState(false);
  const [lyricError, setLyricError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [managedUsers, setManagedUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [newUser, setNewUser] = useState({ username: "", password: "", is_admin: false });
  const [resetPasswords, setResetPasswords] = useState({});

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const response = await fetch(`${AUTH_API}/me`);
        const payload = await response.json();
        if (response.ok && payload.code === 200 && payload.data?.[0]) {
          if (!cancelled) setAuthUser(payload.data[0]);
          return;
        }
        const statusResponse = await fetch(`${AUTH_API}/setup_status`);
        const statusPayload = await statusResponse.json();
        if (!cancelled) setSetupRequired(Boolean(statusPayload.data?.[0]?.setup_required));
      } catch {
        if (!cancelled) setSetupRequired(false);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const loadManagedUsers = async () => {
    if (!authUser?.is_admin) return;
    setUsersLoading(true);
    setAccountError("");
    try {
      const response = await fetch(`${AUTH_API}/users`);
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "获取用户失败");
      setManagedUsers(payload.data || []);
    } catch (reason) {
      setAccountError(reason.message || "获取用户失败");
    } finally {
      setUsersLoading(false);
    }
  };

  const openAccountPanel = () => {
    setAccountOpen(true);
    loadManagedUsers();
  };

  const createManagedUser = async (event) => {
    event.preventDefault();
    setUsersLoading(true);
    setAccountError("");
    try {
      const response = await fetch(`${AUTH_API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "创建用户失败");
      setNewUser({ username: "", password: "", is_admin: false });
      await loadManagedUsers();
    } catch (reason) {
      setAccountError(reason.message || "创建用户失败");
      setUsersLoading(false);
    }
  };

  const toggleManagedUser = async (user) => {
    setAccountError("");
    try {
      const response = await fetch(`${AUTH_API}/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "更新用户失败");
      setManagedUsers((previous) => previous.map((item) => item.id === user.id ? payload.data[0] : item));
    } catch (reason) {
      setAccountError(reason.message || "更新用户失败");
    }
  };

  const resetManagedPassword = async (event, user) => {
    event.preventDefault();
    const password = resetPasswords[user.id] || "";
    if (password.length < 8) return;
    setAccountError("");
    try {
      const response = await fetch(`${AUTH_API}/users/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "重置密码失败");
      setResetPasswords((previous) => ({ ...previous, [user.id]: "" }));
      if (user.id === authUser.id) await logout();
    } catch (reason) {
      setAccountError(reason.message || "重置密码失败");
    }
  };

  const logout = async () => {
    await fetch(`${AUTH_API}/logout`, { method: "POST" }).catch(() => {});
    audioRef.current?.pause();
    setCurrent(null);
    setPlaying(false);
    setAccountOpen(false);
    setAuthUser(null);
    setSetupRequired(false);
    setFavorites(new Set());
    setSavedPlaylists([]);
  };

  const playlistConfigs = useMemo(() => ({
    ...PLAYLISTS,
    ...Object.fromEntries(savedPlaylists.map((item) => [
      savedPlaylistKey(item.playlist_id),
      { id: item.playlist_id, name: item.name || `歌单 ${item.playlist_id}` },
    ])),
  }), [savedPlaylists]);

  const getCollectionKeys = (collectionView, items = savedPlaylists) => (
    collectionView === "playlists"
      ? items.map((item) => savedPlaylistKey(item.playlist_id))
      : PLAYLIST_COLLECTIONS[collectionView]?.keys || []
  );

  const resultLabel = useMemo(() => {
    if (searchedKeyword) return `“${searchedKeyword}”的搜索结果`;
    return playlistConfigs[view] ? playlistName : "推荐歌曲";
  }, [playlistConfigs, playlistName, searchedKeyword, view]);

  const activeLyricIndex = useMemo(() => {
    let activeIndex = -1;
    for (let index = 0; index < lyricLines.length; index += 1) {
      if (lyricLines[index].time > time + 0.08) break;
      activeIndex = index;
    }
    return activeIndex;
  }, [lyricLines, time]);

  useEffect(() => {
    if (!lyricsOpen || !current?.id) return;
    let cancelled = false;

    const loadLyrics = async () => {
      const cached = lyricCacheRef.current.get(current.id);
      if (cached) {
        setLyricLines(cached);
        setLyricLoading(false);
        setLyricError("");
        return;
      }

      setLyricLoading(true);
      setLyricLines([]);
      setLyricError("");
      try {
        const response = await fetch(`${API}/music_lyric`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id }),
        });
        const payload = await response.json();
        if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "歌词获取失败");
        const lyric = payload.data?.[0] || {};
        const lines = combineLyrics(lyric.lrc, lyric.tlyric);
        lyricCacheRef.current.set(current.id, lines);
        if (!cancelled) setLyricLines(lines);
      } catch (reason) {
        if (!cancelled) setLyricError(reason.message || "暂时无法获取歌词");
      } finally {
        if (!cancelled) setLyricLoading(false);
      }
    };

    loadLyrics();
    return () => { cancelled = true; };
  }, [current?.id, lyricsOpen]);

  useEffect(() => {
    if (!lyricsOpen || activeLyricIndex < 0) return;
    lyricLineRefs.current[activeLyricIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLyricIndex, lyricsOpen]);

  useEffect(() => {
    if (!lyricsOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setLyricsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [lyricsOpen]);

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

  const mapPlaylistTrack = (item) => ({
    id: item.id,
    name: item.name,
    artists: (item.ar || []).map((artist) => artist.name).filter(Boolean).join(" / ") || "未知歌手",
    album: item.al?.name || "未知专辑",
    picUrl: item.al?.picUrl || "",
  });

  const showPlaylistPage = (tracks, targetPage) => {
    const lastPage = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(targetPage, 1), lastPage);
    const start = (safePage - 1) * PAGE_SIZE;
    setPlaylistPage(safePage);
    setSongs(tracks.slice(start, start + PAGE_SIZE));
  };

  const fetchPlaylistById = async (playlistId, fallbackName = `歌单 ${playlistId}`) => {
    const response = await fetch(`${API}/music_playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playlistId }),
    });
    const payload = await response.json();
    const playlist = payload.data?.[0];
    if (!response.ok || payload.code !== 200 || !Array.isArray(playlist?.tracks)) {
      throw new Error(payload.msg || `获取${fallbackName}失败`);
    }
    const tracks = playlist.tracks.map(mapPlaylistTrack);
    return {
      name: playlist.name || fallbackName,
      coverImgUrl: playlist.coverImgUrl || "",
      trackCount: playlist.trackCount || tracks.length,
      tracks,
    };
  };

  const fetchPlaylist = async (playlistView) => {
    const playlistConfig = playlistConfigs[playlistView];
    if (!playlistConfig) throw new Error("歌单不存在或已被移除");
    return fetchPlaylistById(playlistConfig.id, playlistConfig.name);
  };

  const loadSavedPlaylists = async () => {
    const response = await fetch(`${SONG_API}/favorite_playlists?platform=wyy`);
    const payload = await response.json();
    if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "获取收藏歌单失败");
    const items = payload.data || [];
    setSavedPlaylists(items);
    setPlaylistStore((previous) => {
      const next = { ...previous };
      const currentKeys = new Set(items.map((item) => savedPlaylistKey(item.playlist_id)));
      Object.keys(next).forEach((key) => {
        if (key.startsWith("saved-") && !currentKeys.has(key)) delete next[key];
      });
      items.forEach((item) => {
        const key = savedPlaylistKey(item.playlist_id);
        next[key] = {
          name: item.name || `歌单 ${item.playlist_id}`,
          coverImgUrl: item.coverImgUrl || "",
          trackCount: item.trackCount || 0,
          tracks: Array.isArray(previous[key]?.tracks) ? previous[key].tracks : null,
        };
      });
      return next;
    });
    return items;
  };

  const addSavedPlaylist = async (event) => {
    event.preventDefault();
    const value = playlistIdInput.trim();
    const playlistId = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(playlistId) || playlistId <= 0) {
      setPlaylistCollectionError("请输入正确的网易云歌单 ID");
      return;
    }

    setPlaylistMutationLoading(true);
    setPlaylistCollectionError("");
    try {
      const playlist = await fetchPlaylistById(playlistId);
      const response = await fetch(`${SONG_API}/favorite_playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "wyy", playlist_id: playlistId }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "添加歌单失败");

      const item = {
        platform: "wyy",
        playlist_id: playlistId,
        name: playlist.name,
        coverImgUrl: playlist.coverImgUrl,
        trackCount: playlist.trackCount,
      };
      setSavedPlaylists((previous) => [item, ...previous.filter((entry) => entry.playlist_id !== playlistId)]);
      setPlaylistStore((previous) => ({ ...previous, [savedPlaylistKey(playlistId)]: playlist }));
      setPlaylistIdInput("");
    } catch (reason) {
      setPlaylistCollectionError(reason.message || "添加歌单失败");
    } finally {
      setPlaylistMutationLoading(false);
    }
  };

  const removeSavedPlaylist = async (playlistId) => {
    setDeletingPlaylistId(playlistId);
    setPlaylistCollectionError("");
    try {
      const response = await fetch(`${SONG_API}/favorite_playlist`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "wyy", playlist_id: playlistId }),
      });
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) throw new Error(payload.msg || "删除歌单失败");
      setSavedPlaylists((previous) => previous.filter((item) => item.playlist_id !== playlistId));
      setPlaylistStore((previous) => {
        const next = { ...previous };
        delete next[savedPlaylistKey(playlistId)];
        return next;
      });
    } catch (reason) {
      setPlaylistCollectionError(reason.message || "删除歌单失败");
    } finally {
      setDeletingPlaylistId(null);
    }
  };

  const loadPlaylistCollection = async (collectionView = "playlists") => {
    const collection = PLAYLIST_COLLECTIONS[collectionView];
    if (!collection) return;

    setView(collectionView);
    setSearchedKeyword("");
    setHasNextPage(false);
    setError("");
    setPlaylistCollectionError("");

    if (collectionView === "playlists") {
      setLoading(true);
      try {
        await loadSavedPlaylists();
      } catch (reason) {
        setPlaylistCollectionError(reason.message || "获取收藏歌单失败");
      } finally {
        setLoading(false);
      }
      return;
    }

    const missingKeys = getCollectionKeys(collectionView).filter((key) => !playlistStore[key]);
    if (missingKeys.length === 0) return;

    setLoading(true);
    const results = await Promise.allSettled(missingKeys.map(async (key) => [key, await fetchPlaylist(key)]));
    const loaded = Object.fromEntries(
      results.filter((result) => result.status === "fulfilled").map((result) => result.value),
    );
    if (Object.keys(loaded).length) {
      setPlaylistStore((previous) => ({ ...previous, ...loaded }));
    }
    if (results.some((result) => result.status === "rejected")) {
      setPlaylistCollectionError("部分歌单暂时没有加载成功，可以点击卡片重试");
    }
    setLoading(false);
  };

  const loadPlaylist = async (playlistView, targetPage = 1, originView = playlistOrigin) => {
    const playlistConfig = playlistConfigs[playlistView];
    if (!playlistConfig) return;

    setPlaylistOrigin(originView);
    setView(playlistView);
    setSearchedKeyword("");
    setHasNextPage(false);
    setLoading(true);
    setError("");

    const storedPlaylist = playlistStore[playlistView];
    if (storedPlaylist && Array.isArray(storedPlaylist.tracks)) {
      setPlaylistName(storedPlaylist.name);
      setPlaylistTracks(storedPlaylist.tracks);
      showPlaylistPage(storedPlaylist.tracks, targetPage);
      setLoading(false);
      return;
    }

    try {
      const playlist = await fetchPlaylist(playlistView);
      setPlaylistName(playlist.name);
      setPlaylistTracks(playlist.tracks);
      setPlaylistStore((previous) => ({ ...previous, [playlistView]: playlist }));
      showPlaylistPage(playlist.tracks, targetPage);
    } catch (reason) {
      setSongs([]);
      setError(reason.message || `获取${playlistConfig.name}失败`);
    } finally {
      setLoading(false);
    }
  };

  const goToPlaylistPage = (targetPage) => {
    if (targetPage < 1 || targetPage > Math.ceil(playlistTracks.length / PAGE_SIZE) || loading) return;
    showPlaylistPage(playlistTracks, targetPage);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
    if (!authUser) return;
    setFavorites(new Set());
    setSavedPlaylists([]);
    loadFavorites();
    loadSavedPlaylists().catch(() => {});
    loadRecommendations("discover");
  }, [authUser?.id]);

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

  const prepareFollowingSong = (song) => {
    if (!isIphoneSafari()) return;
    const queue = playbackQueueRef.current;
    if (queue.length < 2) return;
    const currentIndex = queue.findIndex((item) => item.id === song.id);
    if (currentIndex < 0) return;

    let nextSong;
    if (playMode === "shuffle") {
      const candidates = queue.filter((item) => item.id !== song.id);
      nextSong = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      nextSong = queue[currentIndex + 1];
    }
    preparedNextSongRef.current = nextSong || null;
    if (!nextSong || preparedSongDetailsRef.current.has(nextSong.id) || preparingSongIdsRef.current.has(nextSong.id)) return;

    preparingSongIdsRef.current.add(nextSong.id);
    requestFreshSong(nextSong)
      .then((detail) => preparedSongDetailsRef.current.set(nextSong.id, detail))
      .catch(() => {})
      .finally(() => preparingSongIdsRef.current.delete(nextSong.id));
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
      preparedSongDetailsRef.current.set(song.id, detail);
      prepareFollowingSong(resolved);
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

  const playSong = async (song, { preserveQueue = false } = {}) => {
    const audio = audioRef.current;
    if (!preserveQueue) {
      const sourceQueue = playlistConfigs[view] && playlistTracks.length ? playlistTracks : songs;
      playbackQueueRef.current = [...sourceQueue];
      playbackSourceRef.current = view;
    }
    if (current?.id === song.id && audio?.src) {
      if (audio.paused) await audio.play(); else audio.pause();
      return;
    }
    setResolvingId(song.id);
    setError("");
    try {
      let detail;
      const preparedDetail = preparedSongDetailsRef.current.get(song.id);
      if (preparedDetail?.url) {
        detail = preparedDetail;
      } else if (song.url) {
        detail = {
          id: song.id,
          url: song.url,
          name: song.name,
          artist: song.artists,
          album: song.album,
          picUrl: song.picUrl,
          cached: song.cached !== false,
        };
      } else {
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
      }
      const resolved = { ...song, ...detail, artists: detail.artist || song.artists };
      setCurrent(resolved);
      audio.src = detail.url;
      try {
        const playback = audio.play();
        if (detail.cached) {
          fetch(`${SONG_API}/song_cache`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: "wyy", song_id: song.id }),
          }).catch(() => {});
        }
        await playback;
        preparedSongDetailsRef.current.set(song.id, detail);
        prepareFollowingSong(resolved);
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

  const playQueueSong = (song) => {
    if (playbackSourceRef.current === view && playlistConfigs[view] && playlistTracks.length) {
      const trackIndex = playlistTracks.findIndex((item) => item.id === song.id);
      const targetPage = trackIndex >= 0 ? Math.floor(trackIndex / PAGE_SIZE) + 1 : playlistPage;
      if (targetPage !== playlistPage) showPlaylistPage(playlistTracks, targetPage);
    }
    playSong(song, { preserveQueue: true });
  };

  const stepSong = (delta) => {
    const fallbackQueue = playlistConfigs[view] && playlistTracks.length ? playlistTracks : songs;
    const queue = playbackQueueRef.current.length ? playbackQueueRef.current : fallbackQueue;
    if (!queue.length) return;
    const foundIndex = queue.findIndex((song) => song.id === current?.id);

    if (playMode === "shuffle") {
      if (delta > 0 && preparedNextSongRef.current) {
        const preparedNextSong = preparedNextSongRef.current;
        preparedNextSongRef.current = null;
        playQueueSong(preparedNextSong);
        return;
      }
      if (queue.length === 1) {
        playQueueSong(queue[0]);
        return;
      }
      let randomIndex = foundIndex;
      while (randomIndex === foundIndex) randomIndex = Math.floor(Math.random() * queue.length);
      playQueueSong(queue[randomIndex]);
      return;
    }

    const nextIndex = foundIndex >= 0 ? foundIndex + delta : delta >= 0 ? 0 : queue.length - 1;
    if (nextIndex < 0) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    if (nextIndex >= queue.length) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    playQueueSong(queue[nextIndex]);
  };

  useEffect(() => {
    if (!("mediaSession" in navigator)) return undefined;

    const setHandler = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // 某些浏览器版本可能不支持全部媒体操作。
      }
    };

    setHandler("play", () => audioRef.current?.play());
    setHandler("pause", () => audioRef.current?.pause());
    setHandler("previoustrack", () => stepSong(-1));
    setHandler("nexttrack", () => stepSong(1));

    return () => {
      ["play", "pause", "previoustrack", "nexttrack"].forEach((action) => setHandler(action, null));
    };
  }, [current, playMode, playlistConfigs, playlistPage, playlistTracks, songs, view]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    if (current && "MediaMetadata" in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.name || "未知歌曲",
        artist: current.artists || "未知歌手",
        album: current.album || "未知专辑",
        artwork: current.picUrl ? [{ src: current.picUrl }] : [],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }

    try {
      navigator.mediaSession.playbackState = current ? (playing ? "playing" : "paused") : "none";
    } catch {
      // Safari 等实现可能不允许直接设置播放状态。
    }
  }, [current, playing]);

  if (authLoading) {
    return <main className="auth-page"><div className="auth-loading"><SpinnerGap className="spin" size={28} /><span>正在打开 iMusic…</span></div></main>;
  }

  if (!authUser) {
    return <AuthScreen setupRequired={setupRequired} onAuthenticated={(user) => { setAuthUser(user); setSetupRequired(false); }} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="wordmark">iMusic</div>
        <nav aria-label="主导航">
          <button className={`nav-item ${view === "discover" ? "active" : ""}`} onClick={() => loadRecommendations("discover")} aria-label="发现"><Compass size={24} weight="regular" /><span>发现</span></button>
          <button className={`nav-item ${view === "rankings" || (playlistConfigs[view] && playlistOrigin === "rankings") ? "active" : ""}`} onClick={() => loadPlaylistCollection("rankings")} aria-label="排行榜"><Trophy size={24} weight={view === "rankings" || (playlistConfigs[view] && playlistOrigin === "rankings") ? "fill" : "regular"} /><span>排行榜</span></button>
          <button className={`nav-item ${view === "playlists" || (playlistConfigs[view] && playlistOrigin === "playlists") ? "active" : ""}`} onClick={() => loadPlaylistCollection("playlists")} aria-label="我的歌单"><Queue size={24} weight={view === "playlists" || (playlistConfigs[view] && playlistOrigin === "playlists") ? "fill" : "regular"} /><span>我的歌单</span></button>
          <button className={`nav-item ${view === "favorites" ? "active" : ""}`} onClick={() => loadFavorites({ showList: true, targetPage: 1 })} aria-label="我喜欢"><Heart size={24} weight={view === "favorites" ? "fill" : "regular"} /><span>我喜欢</span></button>
        </nav>
        <button className="settings" onClick={openAccountPanel}><UserCircle size={23} /><span>{authUser.username}</span></button>
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
          {PLAYLIST_COLLECTIONS[view] ? (
            <>
              <div className="playlist-library-heading">
                <div><h2>{PLAYLIST_COLLECTIONS[view].title}</h2><p>{PLAYLIST_COLLECTIONS[view].description}</p></div>
                {view === "playlists" ? (
                  <form className="playlist-add-form" onSubmit={addSavedPlaylist}>
                    <input value={playlistIdInput} onChange={(event) => setPlaylistIdInput(event.target.value)} inputMode="numeric" placeholder="输入网易云歌单 ID" aria-label="网易云歌单 ID" disabled={playlistMutationLoading} />
                    <button type="submit" disabled={playlistMutationLoading || !playlistIdInput.trim()}>
                      {playlistMutationLoading ? <SpinnerGap className="spin" size={17} /> : <Plus size={17} weight="bold" />}
                      添加歌单
                    </button>
                  </form>
                ) : loading && <span><SpinnerGap className="spin" size={16} />正在同步歌单…</span>}
              </div>
              {playlistCollectionError && <div className="playlist-notice">{playlistCollectionError}</div>}
              {view === "playlists" && !loading && savedPlaylists.length === 0 && (
                <div className="playlist-empty"><Queue size={30} weight="duotone" /><strong>还没有收藏歌单</strong><span>在上方输入网易云歌单 ID 添加</span></div>
              )}
              <div className={`playlist-grid ${loading ? "loading-playlists" : ""}`}>
                {getCollectionKeys(view).map((key) => {
                  const config = playlistConfigs[key];
                  const playlist = playlistStore[key];
                  const playlistId = config.id;
                  return (
                    <article className="playlist-card" key={key}>
                      <button className="playlist-card-open" onClick={() => loadPlaylist(key, 1, view)}>
                        <span className="playlist-cover-wrap">
                          {playlist?.coverImgUrl ? <img src={playlist.coverImgUrl} alt={`${playlist.name}封面`} /> : <span className="playlist-cover-fallback"><Queue size={42} weight="duotone" /></span>}
                          <span className="playlist-card-play"><Play size={19} weight="fill" /></span>
                        </span>
                        <strong>{playlist?.name || config.name}</strong>
                        <span>{playlist ? `${playlist.trackCount} 首歌曲` : loading ? "正在读取歌单…" : "点击加载歌单"}</span>
                      </button>
                      {view === "playlists" && (
                        <button className="playlist-delete" onClick={() => removeSavedPlaylist(playlistId)} aria-label={`删除${playlist?.name || config.name}`} title="从我的歌单中删除" disabled={deletingPlaylistId === playlistId}>
                          {deletingPlaylistId === playlistId ? <SpinnerGap className="spin" size={17} /> : <Trash size={17} />}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className={`results-title ${playlistConfigs[view] ? "playlist-detail-title" : ""}`}>
                <div>
                  {playlistConfigs[view] && <button className="back-to-playlists" onClick={() => loadPlaylistCollection(playlistOrigin)}><CaretLeft size={16} weight="bold" />{PLAYLIST_COLLECTIONS[playlistOrigin].title}</button>}
                  <h2>{view === "favorites" ? "我喜欢的音乐" : resultLabel}</h2>
                </div>
                {loading && <span>{searchedKeyword ? "正在搜索…" : playlistConfigs[view] ? `正在加载${playlistConfigs[view].name}…` : "正在加载推荐…"}</span>}
              </div>
              <div className="table-head"><span>歌曲</span><span>歌手</span><span>专辑</span><span /></div>
              {error && <div className="message error"><span>{error}</span><button onClick={() => playlistConfigs[view] ? loadPlaylist(view, playlistPage) : view === "favorites" ? loadFavorites({ showList: true, targetPage: favoritePage }) : searchedKeyword ? loadPage(searchedKeyword || query, page) : loadRecommendations(view)}>重试</button></div>}
              {!loading && !error && songs.length === 0 && <div className="message"><MusicNoteSimple size={30} /><strong>{view === "favorites" ? "还没有喜欢的歌曲" : searchedKeyword ? "没有找到相关歌曲" : playlistConfigs[view] ? `${playlistConfigs[view].name}暂时没有歌曲` : "还没有可推荐的缓存歌曲"}</strong><span>{searchedKeyword ? "试试歌手名或更短的关键词" : playlistConfigs[view] ? `稍后重试加载${playlistConfigs[view].name}` : "播放或收藏歌曲后，这里会出现推荐"}</span></div>}
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
                  <button onClick={() => goToPage(page - 1)} disabled={page === 1 || loading}><CaretLeft size={17} weight="bold" />上一页</button>
                  <span>第 {page} 页</span>
                  <button onClick={() => goToPage(page + 1)} disabled={!hasNextPage || loading}>下一页<CaretRight size={17} weight="bold" /></button>
                </nav>
              )}
              {playlistConfigs[view] && !error && songs.length > 0 && (
                <nav className="pagination" aria-label={`${playlistConfigs[view].name}分页`}>
                  <button onClick={() => goToPlaylistPage(playlistPage - 1)} disabled={playlistPage === 1 || loading}><CaretLeft size={17} weight="bold" />上一页</button>
                  <span>第 {playlistPage} / {Math.ceil(playlistTracks.length / PAGE_SIZE)} 页</span>
                  <button onClick={() => goToPlaylistPage(playlistPage + 1)} disabled={playlistPage * PAGE_SIZE >= playlistTracks.length || loading}>下一页<CaretRight size={17} weight="bold" /></button>
                </nav>
              )}
              {view === "favorites" && !error && songs.length > 0 && (
                <nav className="pagination" aria-label="喜欢音乐分页">
                  <button onClick={() => goToFavoritePage(favoritePage - 1)} disabled={favoritePage === 1 || loading}><CaretLeft size={17} weight="bold" />上一页</button>
                  <span>第 {favoritePage} 页</span>
                  <button onClick={() => goToFavoritePage(favoritePage + 1)} disabled={!favoriteHasNextPage || loading}>下一页<CaretRight size={17} weight="bold" /></button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>

      {accountOpen && (
        <>
          <button className="account-backdrop" onClick={() => setAccountOpen(false)} aria-label="关闭账号管理" />
          <aside className="account-panel" aria-label="账号管理">
            <header className="account-header">
              <div><span>当前账号</span><strong>{authUser.username}</strong><small>{authUser.is_admin ? "管理员" : "普通用户"}</small></div>
              <button onClick={() => setAccountOpen(false)} aria-label="关闭账号管理"><X size={21} /></button>
            </header>
            <div className="account-content">
              {authUser.is_admin && (
                <>
                  <section className="account-section">
                    <div className="account-section-title"><div><ShieldCheck size={20} /><strong>用户管理</strong></div>{usersLoading && <SpinnerGap className="spin" size={17} />}</div>
                    <form className="user-create-form" onSubmit={createManagedUser}>
                      <input value={newUser.username} onChange={(event) => setNewUser((previous) => ({ ...previous, username: event.target.value }))} placeholder="新用户账号" minLength={3} required />
                      <input type="password" value={newUser.password} onChange={(event) => setNewUser((previous) => ({ ...previous, password: event.target.value }))} placeholder="初始密码（至少 8 位）" minLength={8} required />
                      <label><input type="checkbox" checked={newUser.is_admin} onChange={(event) => setNewUser((previous) => ({ ...previous, is_admin: event.target.checked }))} />管理员</label>
                      <button type="submit" disabled={usersLoading}><Plus size={17} weight="bold" />新增用户</button>
                    </form>
                  </section>
                  <section className="user-list">
                    {managedUsers.map((user) => (
                      <article className="user-card" key={user.id}>
                        <div className="user-card-top"><div className="user-avatar">{user.username.slice(0, 1).toUpperCase()}</div><div><strong>{user.username}</strong><span>{user.is_admin ? "管理员" : "普通用户"} · {user.is_active ? "正常" : "已停用"}</span></div><button onClick={() => toggleManagedUser(user)} disabled={user.id === authUser.id}>{user.is_active ? "停用" : "启用"}</button></div>
                        <form className="password-reset" onSubmit={(event) => resetManagedPassword(event, user)}><Key size={16} /><input type="password" value={resetPasswords[user.id] || ""} onChange={(event) => setResetPasswords((previous) => ({ ...previous, [user.id]: event.target.value }))} placeholder="输入新密码" minLength={8} /><button type="submit" disabled={(resetPasswords[user.id] || "").length < 8}>重置密码</button></form>
                      </article>
                    ))}
                  </section>
                </>
              )}
              {accountError && <div className="auth-error">{accountError}</div>}
              <button className="logout-button" onClick={logout}><SignOut size={19} />退出登录</button>
            </div>
          </aside>
        </>
      )}

      {lyricsOpen && (
        <>
          <button className="lyrics-backdrop" onClick={() => setLyricsOpen(false)} aria-label="关闭歌词" />
          <aside className="lyrics-panel" aria-label="歌词面板">
            <header className="lyrics-panel-header">
              <div>
                <span>正在播放</span>
                <strong>{current?.name || "歌词"}</strong>
                {current?.artists && <small>{current.artists}</small>}
              </div>
              <button onClick={() => setLyricsOpen(false)} aria-label="关闭歌词"><X size={21} /></button>
            </header>
            <div className="lyrics-scroll" aria-live="polite">
              {!current && <div className="lyrics-status"><MusicNoteSimple size={32} weight="duotone" /><strong>还没有播放歌曲</strong><span>播放一首歌曲后即可查看歌词</span></div>}
              {current && lyricLoading && <div className="lyrics-status"><SpinnerGap className="spin" size={28} /><span>正在加载歌词…</span></div>}
              {current && !lyricLoading && lyricError && <div className="lyrics-status"><MusicNoteSimple size={30} /><strong>歌词加载失败</strong><span>{lyricError}</span></div>}
              {current && !lyricLoading && !lyricError && lyricLines.length === 0 && <div className="lyrics-status"><MusicNoteSimple size={32} weight="duotone" /><strong>暂无歌词</strong><span>这首歌可能是纯音乐，或暂未收录歌词</span></div>}
              {current && !lyricLoading && lyricLines.length > 0 && (
                <div className="lyrics-lines">
                  {lyricLines.map((line, index) => (
                    <button
                      key={`${line.time}-${index}`}
                      ref={(node) => { lyricLineRefs.current[index] = node; }}
                      className={`lyric-line ${index === activeLyricIndex ? "active" : ""}`}
                      onClick={() => { if (audioRef.current) audioRef.current.currentTime = line.time; }}
                      aria-current={index === activeLyricIndex ? "true" : undefined}
                    >
                      <span>{line.text}</span>
                      {line.translation && line.translation !== line.text && <small>{line.translation}</small>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

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
        <button className={`lyrics ${lyricsOpen ? "active" : ""}`} onClick={() => setLyricsOpen((open) => !open)} title="查看歌词" aria-label={lyricsOpen ? "关闭歌词" : "查看歌词"} aria-expanded={lyricsOpen}><Queue size={24} weight={lyricsOpen ? "fill" : "regular"} /><span>歌词</span></button>
      </footer>

      <audio ref={audioRef} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={handleAudioError} onEnded={() => stepSong(1)} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} />
    </div>
  );
}
