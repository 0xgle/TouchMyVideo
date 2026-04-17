const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path   = require('path');
const express = require('express');
const cors   = require('cors');
const { spawn, execSync } = require('child_process');
const fs     = require('fs');
const os     = require('os');
const https  = require('https');
const http   = require('http');

const PORT   = 43210;
const IS_DEV = process.env.NODE_ENV === 'development';

// ─── Paths ────────────────────────────────────────────────────────────────────
const USER_DATA     = app.getPath('userData');
const DEFAULT_DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads', 'TouchMyVideo');
const SETTINGS_FILE = path.join(USER_DATA, 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {}
  return {};
}

function saveSettings(settings) {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2)); } catch {}
}

function getDownloadsDir() {
  const s = loadSettings();
  return s.downloadsDir || DEFAULT_DOWNLOADS_DIR;
}
const HISTORY_FILE  = path.join(USER_DATA, 'history.json');
const TOOLS_DIR     = path.join(USER_DATA, 'tools');
const YTDLP_PATH    = path.join(TOOLS_DIR, 'yt-dlp.exe');
const FFMPEG_PATH   = path.join(TOOLS_DIR, 'ffmpeg.exe');
const LOG_FILE      = path.join(USER_DATA, 'debug.log');

const YTDLP_URL  = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

// ─── Logger ───────────────────────────────────────────────────────────────────
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

log('App starting. USER_DATA:', USER_DATA);
log('TOOLS_DIR:', TOOLS_DIR);
log('YTDLP_PATH:', YTDLP_PATH);

// ─── Download helper ──────────────────────────────────────────────────────────
function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR, { recursive: true });
    log('Downloading:', url, '→', dest);

    const follow = (url, depth) => {
      if (depth > 10) return reject(new Error('Too many redirects'));
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { headers: { 'User-Agent': 'TouchMyVideo/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          log('Redirect →', res.headers.location);
          return follow(res.headers.location, depth + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;
        const file = fs.createWriteStream(dest);
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0 && onProgress) onProgress(Math.round((downloaded / total) * 100));
        });
        res.pipe(file);
        file.on('finish', () => { file.close(() => { log('Downloaded:', dest); resolve(); }); });
        file.on('error', (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
      });
      req.on('error', reject);
    };
    follow(url, 0);
  });
}

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    log('Extracting:', zipPath, '→', destDir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const cmd = `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`;
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd]);
    let errOut = '';
    ps.stderr.on('data', d => { errOut += d.toString(); });
    ps.on('close', code => {
      if (code === 0) { log('Extracted OK'); resolve(); }
      else reject(new Error('PowerShell exit ' + code + ': ' + errOut.slice(0, 200)));
    });
    ps.on('error', reject);
  });
}

function findFile(dir, name) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { const r = findFile(full, name); if (r) return r; }
      else if (e.name === name) return full;
    }
  } catch {}
  return null;
}

function send(event, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(event, data);
  }
}

async function ensureTools() {
  const needYtdlp  = !fs.existsSync(YTDLP_PATH);
  const needFfmpeg = !fs.existsSync(FFMPEG_PATH);

  log('ensureTools: needYtdlp=', needYtdlp, 'needFfmpeg=', needFfmpeg);

  if (!needYtdlp && !needFfmpeg) {
    log('All tools present, skipping setup');
    return;
  }

  const tools = [];
  if (needYtdlp)  tools.push('yt-dlp');
  if (needFfmpeg) tools.push('ffmpeg');
  send('setup-start', { tools });

  try {
    if (needYtdlp) {
      send('setup-progress', { pct: 0, label: 'Pobieranie yt-dlp (~10 MB)...' });
      await downloadFile(YTDLP_URL, YTDLP_PATH, pct =>
        send('setup-progress', { pct, label: `yt-dlp: ${pct}%` })
      );
      log('yt-dlp installed at:', YTDLP_PATH, '| exists:', fs.existsSync(YTDLP_PATH));
    }

    if (needFfmpeg) {
      const zipPath    = path.join(TOOLS_DIR, 'ffmpeg.zip');
      const extractDir = path.join(TOOLS_DIR, 'ffmpeg_ex');

      send('setup-progress', { pct: 0, label: 'Pobieranie ffmpeg (~50 MB)...' });
      await downloadFile(FFMPEG_URL, zipPath, pct =>
        send('setup-progress', { pct, label: `ffmpeg: ${pct}%` })
      );

      send('setup-progress', { pct: 99, label: 'Rozpakowywanie ffmpeg...' });
      await extractZip(zipPath, extractDir);

      const found = findFile(extractDir, 'ffmpeg.exe');
      log('ffmpeg.exe found at:', found);
      if (found) {
        fs.copyFileSync(found, FFMPEG_PATH);
        log('ffmpeg copied to:', FFMPEG_PATH);
      } else {
        throw new Error('ffmpeg.exe not found in zip');
      }

      try { fs.unlinkSync(zipPath); fs.rmSync(extractDir, { recursive: true, force: true }); } catch {}
    }

    log('All tools ready!');
    send('setup-done', {});
  } catch (err) {
    log('Setup ERROR:', err.message);
    send('setup-error', { message: err.message });
  }
}

// ─── History ──────────────────────────────────────────────────────────────────
let history = [];

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    log('History loaded:', history.length, 'items');
  } catch (e) { log('History load error:', e.message); history = []; }
}

function saveHistory() {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2)); } catch {}
}

function pushHistory(entry) {
  history.unshift(entry);
  if (history.length > 200) history = history.slice(0, 200);
  saveHistory();
  send('history-update', history);
}

// ─── Download engine ──────────────────────────────────────────────────────────
const activeDownloads = new Map();

const FORMAT_MAP = {
  '4K':    'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
  '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
  '720p':  'bestvideo[height<=720]+bestaudio/best[height<=720]',
  '480p':  'bestvideo[height<=480]+bestaudio/best[height<=480]',
  'best':  'bestvideo+bestaudio/best',
};

const FORMAT_FALLBACK = {
  '4K':    'best[height<=2160]',
  '1080p': 'best[height<=1080]',
  '720p':  'best[height<=720]',
  '480p':  'best[height<=480]',
  'best':  'best',
};

function startDownload({ url, quality = 'best', audioOnly = false, subtitles = false }) {
  const id = 'dl_' + Date.now();
  log('startDownload:', url, '| quality:', quality, '| audioOnly:', audioOnly);

  // Validate yt-dlp exists
  if (!fs.existsSync(YTDLP_PATH)) {
    log('ERROR: yt-dlp not found at', YTDLP_PATH);
    send('download-complete', { id, success: false, error: 'yt-dlp nie jest zainstalowany. Uruchom aplikację ponownie aby pobrała narzędzia.' });
    return id;
  }

  const entry = {
    id, url,
    quality: audioOnly ? 'MP3' : quality,
    audioOnly, title: url, status: 'downloading',
    progress: 0, speed: '', eta: '', size: '',
    timestamp: new Date().toISOString(),
  };
  pushHistory(entry);
  send('download-started', entry);

  const hasFfmpeg = fs.existsSync(FFMPEG_PATH);
  log('hasFfmpeg:', hasFfmpeg, '| ffmpeg path:', FFMPEG_PATH);

  const args = [
    '--newline',
    '--progress',
    '--no-playlist',
    '--max-downloads', '1',
    '--no-part',
  ];

  if (hasFfmpeg) {
    args.push('--ffmpeg-location', TOOLS_DIR);
  }

  if (audioOnly) {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else if (hasFfmpeg) {
    args.push('-f', FORMAT_MAP[quality] || FORMAT_MAP['best']);
    args.push('--merge-output-format', 'mp4');
  } else {
    // No ffmpeg — use pre-muxed format (has audio+video in one stream)
    args.push('-f', FORMAT_FALLBACK[quality] || FORMAT_FALLBACK['best']);
    log('WARNING: No ffmpeg, using fallback format. Audio may be limited to 720p.');
  }

  if (subtitles) args.push('--write-auto-sub', '--embed-subs', '--sub-lang', 'pl,en');

  const dlDir = getDownloadsDir();
  if (!fs.existsSync(dlDir)) fs.mkdirSync(dlDir, { recursive: true });
  const outputTemplate = path.join(dlDir, '%(title)s.%(ext)s');
  args.push('-o', outputTemplate, url);

  log('Spawning yt-dlp with args:', args.join(' '));

  const proc = spawn(YTDLP_PATH, args, { windowsHide: true });
  activeDownloads.set(id, proc);

  let fullStdout = '';
  proc.stdout.on('data', (raw) => {
    const text = raw.toString();
    fullStdout += text;

    // Parse title
    const titleM = text.match(/\[download\] Destination: .+[/\\](.+?)\.\w+$/m);
    if (titleM) { entry.title = titleM[1]; log('Title:', entry.title); }

    // Parse progress
    const progM = text.match(/(\d+\.?\d*)%\s+of\s+~?([\d.]+\w+)\s+at\s+([\d.]+\w+\/s)\s+ETA\s+([\d:]+)/);
    if (progM) {
      entry.progress = parseFloat(progM[1]);
      entry.size  = progM[2];
      entry.speed = progM[3];
      entry.eta   = progM[4];
    }

    send('download-progress', {
      id, progress: entry.progress, title: entry.title,
      speed: entry.speed, eta: entry.eta, size: entry.size,
    });
  });

  proc.stderr.on('data', (raw) => {
    const text = raw.toString();
    log('yt-dlp stderr:', text.slice(0, 300));
    // Relay meaningful errors to UI
    if (text.includes('ERROR:')) {
      const errLine = text.match(/ERROR:(.+)/)?.[1]?.trim() || text;
      entry.lastError = errLine;
    }
  });

  proc.on('close', (code) => {
    activeDownloads.delete(id);
    log('yt-dlp exited with code:', code);
    entry.status   = code === 0 ? 'completed' : 'error';
    if (code === 0) entry.progress = 100;
    saveHistory();
    send('download-complete', {
      id,
      success: code === 0,
      error: code !== 0 ? (entry.lastError || `yt-dlp zakończył się kodem ${code}. Sprawdź logi: ${LOG_FILE}`) : null,
    });
    send('history-update', history);
  });

  proc.on('error', (err) => {
    activeDownloads.delete(id);
    log('spawn error:', err.message);
    entry.status = 'error';
    saveHistory();
    send('download-complete', { id, success: false, error: err.message });
    send('history-update', history);
  });

  return id;
}

// ─── Local HTTP server ────────────────────────────────────────────────────────
let expressServer;
function startServer() {
  const xapp = express();
  xapp.use(cors({ origin: '*' }));
  xapp.use(express.json());
  xapp.get('/ping', (_, res) => res.json({ status: 'ok', app: 'TouchMyVideo', version: '1.0.0' }));
  xapp.post('/download', (req, res) => {
    const { url, quality, audioOnly, subtitles } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing url' });
    const id = startDownload({ url, quality, audioOnly, subtitles });
    if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); }
    res.json({ success: true, id });
  });
  xapp.get('/history', (_, res) => res.json(history));
  xapp.get('/log', (_, res) => {
    try { res.send('<pre>' + fs.readFileSync(LOG_FILE, 'utf-8') + '</pre>'); }
    catch { res.send('No log file'); }
  });

  const tryListen = (port) => {
    expressServer = xapp.listen(port, '127.0.0.1')
      .on('listening', () => log('HTTP server on port', port))
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          log('Port', port, 'in use, trying', port + 1);
          tryListen(port + 1);
        } else {
          log('Server error:', err.message);
        }
      });
  };
  tryListen(PORT);
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
let tray = null;

function createTrayIcon() {
  const TRAY_ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAKUlEQVR42mNgIBEwkKmB4U4FMYhyDXjAqBCmEaYaphmmGaYZphmIGgCE3gQHMvXVIwAAAABJRU5ErkJggg==';
  try {
    const iconBuf = Buffer.from(TRAY_ICON_B64, 'base64');
    const icon = nativeImage.createFromBuffer(iconBuf);
    tray = new Tray(icon);
  } catch (e) {
    log('Tray icon error:', e.message);
    tray = new Tray(nativeImage.createEmpty());
  }

  const buildMenu = () => Menu.buildFromTemplate([
    { label: 'Otwórz TouchMyVideo', click: showWindow },
    { label: 'Otwórz folder pobierań', click: openDownloads },
    { label: 'Pokaż logi (debug)', click: () => shell.openPath(LOG_FILE) },
    { type: 'separator' },
    { label: 'Zamknij aplikację', click: () => { app.isQuiting = true; app.quit(); } },
  ]);

  tray.setToolTip('TouchMyVideo');
  tray.setContextMenu(buildMenu());
  tray.on('click', showWindow);
  log('Tray created');
}

function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

function openDownloads() {
  const d = getDownloadsDir();
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  shell.openPath(d);
}

// ─── Window ───────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820, height: 680, minWidth: 700, minHeight: 560,
    frame: false, transparent: true, backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.webContents.once('did-finish-load', () => {
    log('Window loaded, starting ensureTools');
    ensureTools().catch(err => log('ensureTools failed:', err.message));
  });

  // Minimize → hide to tray
  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow.hide();
    tray && tray.displayBalloon({
      iconType: 'none',
      title: 'TouchMyVideo',
      content: 'Aplikacja działa w tle. Kliknij ikonę aby otworzyć.',
    });
  });

  // Close button → hide to tray
  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('get-history',     () => history);
ipcMain.handle('clear-history',   () => { history = []; saveHistory(); return true; });
ipcMain.handle('start-download',  (_, p) => { startDownload(p); return true; });
ipcMain.handle('cancel-download', (_, id) => {
  const p = activeDownloads.get(id);
  if (p) { p.kill(); activeDownloads.delete(id); log('Cancelled download:', id); }
  return true;
});
ipcMain.handle('open-downloads',    () => openDownloads());
ipcMain.handle('get-downloads-dir', () => getDownloadsDir());
ipcMain.handle('get-settings',      () => loadSettings());
ipcMain.handle('save-settings',     (_, s) => { saveSettings(s); return true; });
ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Wybierz folder docelowy',
    defaultPath: getDownloadsDir(),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const newDir = result.filePaths[0];
    const settings = loadSettings();
    settings.downloadsDir = newDir;
    saveSettings(settings);
    log('Downloads dir changed to:', newDir);
    return newDir;
  }
  return null;
});
ipcMain.handle('get-version',     () => app.getVersion());
ipcMain.handle('tools-ready',     () => fs.existsSync(YTDLP_PATH) && fs.existsSync(FFMPEG_PATH));
ipcMain.handle('open-log',        () => shell.openPath(LOG_FILE));
ipcMain.handle('reinstall-tools', async () => {
  // Force re-download tools
  try { if (fs.existsSync(YTDLP_PATH)) fs.unlinkSync(YTDLP_PATH); } catch {}
  try { if (fs.existsSync(FFMPEG_PATH)) fs.unlinkSync(FFMPEG_PATH); } catch {}
  await ensureTools();
  return true;
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.hide();
    tray && tray.displayBalloon({ iconType: 'none', title: 'TouchMyVideo', content: 'Aplikacja działa w tle.' });
  }
});
ipcMain.on('window-maximize', () => mainWindow && (mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()));
ipcMain.on('window-close',    () => mainWindow && mainWindow.hide());
ipcMain.on('window-quit',     () => { app.isQuiting = true; app.quit(); });

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  log('App ready');
  loadHistory();
  startServer();
  createWindow();
  createTrayIcon();
});

app.on('window-all-closed', (e) => {
  // Don't quit — stay in tray
  e.preventDefault();
});

app.on('before-quit', () => {
  log('App quitting');
  app.isQuiting = true;
  if (tray) { tray.destroy(); tray = null; }
  if (expressServer) expressServer.close();
  activeDownloads.forEach(p => { try { p.kill(); } catch {} });
});
