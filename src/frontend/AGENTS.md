# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

- Navigation: group saved playlists under one “我的歌单” tab. Show a cover-card grid first, then drill into a paginated song list with an explicit back action. Do not add one sidebar tab per playlist.
- Navigation: keep official charts under a separate “排行榜” tab. “排行榜” contains 热歌榜、飙升榜和新歌榜; “我的歌单” is reserved for user-saved playlists.
- Playlist management: “我的歌单” must be database-backed and configurable by NetEase playlist ID, with visible add and remove controls. Removing a saved playlist must not interrupt the active playback queue.
- Playback: keep browser/Windows system media controls in sync through the Media Session API, including metadata, play/pause, previous track, and next track actions.
- Playback: on iPhone Safari, prepare only the next queued song URL while the current song is playing, then switch the existing audio element and invoke play synchronously from the ended event before any awaited network work.
- Lyrics: keep a player-level lyrics entry. Show synchronized, auto-scrolling lyrics in a right-side panel on desktop and a full-screen panel on mobile; pair translated lines when the API provides them and allow seeking by clicking a line.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
