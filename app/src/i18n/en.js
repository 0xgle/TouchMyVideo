export default {
  // TitleBar
  appVersion: 'v1.0',
  activeDownloads: (n) => `${n} active`,

  // TabBar
  tabDownload: 'Download',
  tabHistory: 'History',
  downloading: 'Downloading...',

  // DownloadPage
  urlLabel: 'Video URL',
  urlPlaceholder: 'https://youtube.com/watch?v=...',
  pasteBtn: '⌘ Paste',
  qualityLabel: 'Video quality',
  optionsLabel: 'Options',
  audioOnlyLabel: 'Audio only',
  audioOnlySub: 'Export as MP3',
  subtitlesLabel: 'Subtitles',
  subtitlesSub: 'Auto-embed SRT',
  thumbnailLabel: 'Thumbnail',
  thumbnailSub: 'Save JPG',
  activeLabel: 'Active downloads',
  activeHint: '— click ■ to stop',
  folderLabel: 'Download folder',
  folderHint: 'Click path to open · Settings saved automatically',
  folderChanging: 'Selecting...',
  folderChange: '✎ Change',
  downloadBtn: 'DOWNLOAD NOW',
  downloadMp3Btn: 'DOWNLOAD MP3',
  preparingBtn: 'PREPARING...',
  sitesLabel: 'Supported services',
  ffmpegWarning: (q) => `${q} requires ffmpeg (downloaded automatically on first use).`,
  extensionHint: 'Install the Chrome / Edge extension to download with one click directly from any page!',

  // HistoryPage
  historyCount: (n) => `${n} entries`,
  clearHistory: 'Clear history',
  historyEmpty: 'No download history',
  historyEmptySub: 'Your downloaded videos will appear here',
  badgeOk: 'OK',
  badgeError: 'Error',
  badgeDownloading: 'Downloading...',
  openFolder: 'Open folder',
  retry: 'Retry',

  // StatusBar
  serverLabel: 'TouchMyVideo · port 43210',
  downloaded: 'Downloads',
  logs: 'Logs',
  repairTools: '⟳ Repair tools',

  // SetupScreen
  setupTitle: 'First-time setup',
  setupDesc: 'TouchMyVideo is downloading required components automatically. This is a one-time action — no manual installation needed.',
  setupDone: 'All ready!',
  setupError: 'Download error',
  setupErrorHint: 'Check your internet connection and restart the app.',
  setupDownloading: 'downloading',
  setupOk: '✓ ok',
  setupStoredAt: 'Files stored at: %AppData%\\TouchMyVideo\\tools\\',

  // Toasts
  toastStarted: '⬇️ Download started',
  toastDone: '✅ Downloaded successfully!',
  toastCancelled: '⏹ Download stopped',
  toastHistoryCleared: 'History cleared',
  toastReinstalling: '⟳ Reinstalling tools...',
  toastReady: '✅ App ready!',

  // Language switcher
  language: 'Language',
};
