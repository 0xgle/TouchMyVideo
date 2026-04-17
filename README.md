<div align="center">

# TouchMyVideo 🎬

**Download your own videos — beautifully.**

[![Release](https://img.shields.io/github/v/release/GITHUB_USERNAME/TouchMyVideo?style=flat-square&color=00ff88)](https://github.com/GITHUB_USERNAME/TouchMyVideo/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](https://github.com/GITHUB_USERNAME/TouchMyVideo/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?style=flat-square)](https://electronjs.org)

</div>

---

## ✨ Features

- **One-click download** — paste a link, click Download
- **4K / 1080p / 720p / 480p / Auto** quality selection
- **MP3 export** — audio-only mode
- **Custom download folder** — choose where files go
- **Download history** — with retry on failure
- **System tray** — runs quietly in the background
- **Stop button** — cancel any active download instantly
- **Auto-installs yt-dlp & ffmpeg** — zero manual setup for end users
- **English & Polish UI** — switchable in the titlebar

---

## 🚀 Download

👉 **[Download latest release](https://github.com/GITHUB_USERNAME/TouchMyVideo/releases/latest)**

1. Download `TouchMyVideo-portable.exe`
2. Double-click — no installation needed
3. On first launch the app downloads required components (~60 MB)
4. Paste a video link and hit Download!

**Requirements:** Windows 10 / 11

---

## 🌐 Supported sites

YouTube, Vimeo, Twitter/X, Facebook, Instagram, TikTok, Dailymotion, Twitch and **1000+ more** via [yt-dlp](https://github.com/yt-dlp/yt-dlp).

---

## 🛠️ Build from source

### Requirements
- [Node.js 18+](https://nodejs.org)

### Quick start

```bash
# Clone the repo
git clone https://github.com/GITHUB_USERNAME/TouchMyVideo.git
cd TouchMyVideo

# Install dependencies & run in dev mode
cd app
npm install
npm run dev
```

### Build portable .exe

```bash
# Option A — double-click
build.bat

# Option B — manual
cd app
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build
```

Output: `app/dist-electron/TouchMyVideo-portable.exe`

---

## 🏗️ Architecture

```
TouchMyVideo/
├── app/
│   ├── main.js          # Electron main process + Express server (port 43210)
│   ├── preload.js       # Secure IPC bridge (contextBridge)
│   └── src/
│       ├── App.jsx      # Root component + state management
│       ├── i18n/        # Translations (en, pl)
│       └── components/
│           ├── DownloadPage.jsx
│           ├── HistoryPage.jsx
│           ├── FolderPicker.jsx
│           ├── SetupScreen.jsx  # First-run auto-installer
│           ├── TitleBar.jsx
│           ├── TabBar.jsx
│           ├── StatusBar.jsx
│           └── LangSwitcher.jsx
├── build.bat            # One-click build script
└── README.md
```

### How it works

```
User pastes URL → React UI → IPC → Electron main process
                                          ↓
                              Checks yt-dlp & ffmpeg in
                              %AppData%\TouchMyVideo\tools\
                                          ↓
                              Spawns yt-dlp with chosen quality
                                          ↓
                              ~/Downloads/TouchMyVideo/video.mp4
```

---

## 🤝 Contributing

Pull requests welcome! For major changes, open an issue first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📝 License

MIT — see [LICENSE](LICENSE)

> **Note:** TouchMyVideo is designed for downloading your own content.
> Downloading copyrighted material without permission may violate terms of service and local laws.

---

<div align="center">
Built with ❤️ using Electron + React
</div>
