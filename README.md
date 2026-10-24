<div align="center">

# TouchMyVideo

**Download your own videos — beautifully.**

[![CI](https://github.com/0xgle/touchmyvideo/actions/workflows/ci.yml/badge.svg)](https://github.com/0xgle/touchmyvideo/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/0xgle/touchmyvideo?style=flat-square&color=19e08a)](https://github.com/0xgle/touchmyvideo/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

A desktop app (Windows, macOS, Linux) and browser extension built on [yt-dlp](https://github.com/yt-dlp/yt-dlp) and ffmpeg.
Paste a link, see what you're getting, pick a quality, done.

## Features

- **Preview before downloading** — title, thumbnail, length, and the qualities the video *actually* has, each with its file size.
- **Video up to 4K or audio only** — MP3, M4A, Opus, FLAC or WAV, with title, author and cover art embedded.
- **Queue** with a configurable number of parallel downloads, accurate progress (video + audio streams combined), speed and time left.
- **Playlists** — a whole playlist or channel tab into its own folder, numbered.
- **Subtitles** (embedded) and thumbnails on request.
- **Compatibility first** — prefers H.264/AAC so files play on TVs, phones and in PowerPoint; switch to MKV to keep every codec.
- **Signed-in content** — optionally reuse your browser's login for members-only / age-restricted videos and YouTube's "confirm you're not a bot".
- **Library** with search, filters, open file, show in folder, retry and copy link.
- **Self-maintaining engine** — installs yt-dlp and ffmpeg on first run (checksum-verified), updates yt-dlp daily. Sites change constantly; an outdated yt-dlp is the #1 reason downloaders stop working.
- **Clipboard suggestions** — copy a link anywhere, switch to the app, one click.
- Tray icon, taskbar progress, system notifications, Polish and English UI.

## Install

Download from **[Releases](https://github.com/0xgle/touchmyvideo/releases/latest)**:

| System | File |
| --- | --- |
| Windows 10/11 | `TouchMyVideo-Setup-x.y.z.exe` (installer) or `TouchMyVideo-portable-x.y.z.exe` |
| macOS | `TouchMyVideo-x.y.z.dmg` — install ffmpeg with `brew install ffmpeg` |
| Linux | `TouchMyVideo-x.y.z.AppImage` |

On first launch the app downloads its engine (yt-dlp and ffmpeg) into its data folder — a one-time step, nothing else to install.
Builds aren't code-signed yet: on Windows choose *More info → Run anyway* in SmartScreen; on macOS right-click the app → *Open*.

### Browser extension (Chrome, Edge, Brave, Opera)

1. Download `TouchMyVideo-extension-*.zip` from the release and unpack it (or use the `extension/` folder of this repo).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick the folder.
3. Use the toolbar button, or right-click a page / link / video → **Download with TouchMyVideo**.

If the app isn't running, the extension starts it through the `touchmyvideo://` link.

## Build from source

Requires [Node.js 22](https://nodejs.org).

```bash
git clone https://github.com/0xgle/touchmyvideo.git
cd touchmyvideo/app
npm install
npm run dev          # Vite + Electron with hot reload
npm test             # unit tests (plain Node, no Electron needed)
npm run build:win    # or build:mac / build:linux → app/dist-electron/
```

On Windows you can also double-click `build.bat`. Pushing a tag like `v2.0.0` builds installers for all three systems on GitHub Actions and attaches them to a release.

Running `npm run dev` without Electron (just `npx vite`) opens the UI in a browser with a built-in mock — handy for working on the interface.

## Architecture

```
app/
├── electron/            main process — plain CommonJS, zero runtime dependencies
│   ├── main.js          window, tray, IPC, notifications, single instance, touchmyvideo:// links
│   ├── downloader.js    queue: probe, schedule, progress, cancel (kills the whole process tree)
│   ├── ytdlp.js         pure functions: yt-dlp arguments, output parsing, progress tracking
│   ├── tools.js         finds / installs / updates yt-dlp and ffmpeg
│   ├── server.js        local API for the extension (see Security)
│   ├── store.js         settings, history, log — atomic writes
│   └── preload.js       the only bridge between UI and system (contextIsolation + sandbox)
├── src/                 React UI
└── test/                node:test unit tests
extension/               Manifest V3 extension
```

yt-dlp runs with a machine-readable `--progress-template` and `--print` markers, so progress, titles and final file paths are parsed reliably instead of scraping human-oriented output. Output is forced to UTF-8, so non-ASCII titles (zażółć gęślą jaźń) survive on Windows.

## Security

The extension talks to the app over `http://127.0.0.1:43210` (43211–43214 if busy). The server:

- listens on loopback only and rejects foreign `Host` headers (DNS-rebinding protection);
- accepts downloads **only from browser-extension origins** — a website you visit can't start downloads on your machine;
- exposes no history, logs or files.

The UI runs sandboxed with a strict Content-Security-Policy; every browser permission except clipboard reading is denied, and links open in your real browser. The URL is always passed to yt-dlp after `--`, so it can never be interpreted as an option.

## License

MIT — see [LICENSE](LICENSE).

> TouchMyVideo is meant for downloading your own content and content you have the rights to.
> Downloading copyrighted material without permission may break a site's terms and the law where you live.
