'use strict';
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Single instance ─────────────────────────────────────────────────────────
// A second launch (or a touchmyvideo:// link) is forwarded to the running app.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

const P = require('./paths');
const store = require('./store');
const tools = require('./tools');
const { DownloadManager, URL_RE } = require('./downloader');
const { createServer } = require('./server');
const { t } = require('./i18n');
const { log, getSettings, setSettings } = store;

const VERSION = app.getVersion();
const PROTOCOL = 'touchmyvideo';
app.setAppUserModelId('com.touchmyvideo.app');

let mainWindow = null;
let tray = null;
let quitting = false;
let manager = null;
let server = null;

log(`TouchMyVideo ${VERSION} starting (${process.platform}/${process.arch})`);

// ─── Protocol: touchmyvideo://download?url=… ─────────────────────────────────
if (P.IS_DEV && process.defaultApp) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

function handleProtocolUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== PROTOCOL + ':') return;
    const target = u.searchParams.get('url');
    if (target && URL_RE.test(target)) {
      showWindow();
      send('external:url', { url: target });
    }
  } catch {}
}
const protocolArg = (argv) => argv.find(a => a.startsWith(PROTOCOL + '://'));

app.on('second-instance', (_e, argv) => {
  const link = protocolArg(argv);
  if (link) handleProtocolUrl(link); else showWindow();
});
app.on('open-url', (e, url) => { e.preventDefault(); app.whenReady().then(() => handleProtocolUrl(url)); });

// ─── Window ──────────────────────────────────────────────────────────────────
function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data);
}

// The page may read the clipboard (link suggestions); every other permission is denied.
function lockDownPermissions() {
  const own = (url) => url.startsWith('file://') || (P.IS_DEV && url.startsWith('http://localhost:5173'));
  const allowed = new Set(['clipboard-read', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => cb(allowed.has(perm) && own(details.requestingUrl || wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((wc, perm, origin) => allowed.has(perm) && own(origin || wc?.getURL() || ''));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040, height: 720, minWidth: 820, minHeight: 600,
    show: false,
    backgroundColor: '#121316',
    title: 'TouchMyVideo',
    icon: path.join(P.ASSETS_DIR, P.IS_WIN ? 'icon.ico' : 'icon.png'),
    // Native window controls (Windows snap layouts work), our own dark bar around them.
    titleBarStyle: 'hidden',
    titleBarOverlay: P.IS_MAC ? undefined : { color: '#121316', symbolColor: '#9a9da4', height: 44 },
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (P.IS_DEV) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) mainWindow.show();
  });

  // Links open in the real browser, never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) e.preventDefault();
  });

  mainWindow.on('close', (e) => {
    if (quitting || !getSettings().closeToTray) return;
    e.preventDefault();
    mainWindow.hide();
    if (!getSettings().trayHintShown && tray && P.IS_WIN) {
      tray.displayBalloon({ iconType: 'info', title: 'TouchMyVideo', content: t('trayHint') });
      setSettings({ trayHintShown: true });
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function showWindow() {
  if (!mainWindow) createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// ─── Tray ────────────────────────────────────────────────────────────────────
function trayIcon() {
  const file = P.IS_MAC ? 'tray_16.png' : 'tray_32.png';
  const img = nativeImage.createFromPath(path.join(P.ASSETS_DIR, file));
  return img.isEmpty() ? nativeImage.createFromPath(path.join(P.ASSETS_DIR, 'icon.png')).resize({ width: 16, height: 16 }) : img;
}

function updateTray() {
  if (!tray) return;
  const active = manager ? manager.activeCount() : 0;
  tray.setToolTip(active ? `TouchMyVideo — ${t('active', active)}` : 'TouchMyVideo');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: t('open'), click: showWindow },
    { label: t('openFolder'), click: openDownloadsDir },
    ...(active ? [{ type: 'separator' }, { label: t('active', active), enabled: false }, { label: t('pauseAll'), click: () => manager.cancelAll() }] : []),
    { type: 'separator' },
    { label: t('quit'), click: requestQuit },
  ]));
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.on('click', showWindow);
  updateTray();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function openDownloadsDir() {
  const d = getSettings().downloadsDir;
  fs.mkdirSync(d, { recursive: true });
  shell.openPath(d);
}

function revealFile(file) {
  if (file && fs.existsSync(file)) shell.showItemInFolder(file);
  else openDownloadsDir();
}

let lastBar = -2;
function updateTaskbar() {
  if (!mainWindow) return;
  const running = manager.list().filter(j => j.status === 'downloading' || j.status === 'processing');
  let value = -1;
  if (running.length) value = running.reduce((a, j) => a + (j.progress || 0), 0) / running.length / 100;
  if (Math.abs(value - lastBar) < 0.005) return;
  lastBar = value;
  mainWindow.setProgressBar(value < 0 ? -1 : Math.max(0.01, value));
}

function notify(job, ok) {
  if (!getSettings().notifications || !Notification.isSupported()) return;
  if (mainWindow?.isVisible() && mainWindow.isFocused()) return; // the UI already shows it
  const n = new Notification({
    title: ok ? t('doneTitle') : t('failTitle'),
    body: (job.title || job.url).slice(0, 120),
    icon: path.join(P.ASSETS_DIR, 'icon.png'),
    silent: ok,
  });
  n.on('click', () => { if (ok) revealFile(job.files[job.files.length - 1]); else showWindow(); });
  n.show();
}

async function requestQuit() {
  if (manager && manager.activeCount() > 0 && mainWindow) {
    showWindow();
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question', buttons: [t('quitYes'), t('quitNo')], defaultId: 1, cancelId: 1,
      message: t('quitConfirm'),
    });
    if (response !== 0) return;
  }
  quitting = true;
  app.quit();
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
function registerIpc() {
  const h = (ch, fn) => ipcMain.handle(ch, (_e, ...a) => fn(...a));

  h('app:info', () => ({ version: VERSION, platform: process.platform, port: server?.port || null, logFile: P.LOG_FILE }));
  h('settings:get', () => getSettings());
  h('settings:set', (patch) => {
    const before = getSettings().language;
    const s = setSettings(patch || {});
    if (s.language !== before) updateTray();
    if ('maxConcurrent' in (patch || {})) manager.pump();
    return s;
  });
  h('settings:pickFolder', async () => {
    const r = await dialog.showOpenDialog(mainWindow, {
      title: t('pickFolder'), defaultPath: getSettings().downloadsDir, properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return setSettings({ downloadsDir: r.filePaths[0] });
  });

  h('tools:status', () => tools.status());
  h('tools:update', () => tools.update({ force: true }));
  h('tools:repair', () => tools.repair());
  h('tools:install', () => tools.ensure());

  h('jobs:list', () => manager.list());
  h('jobs:probe', (url, opts) => manager.probe(String(url || '').trim(), opts));
  h('jobs:add', (req) => manager.add(req || {}));
  h('jobs:cancel', (id) => manager.cancel(id));
  h('jobs:retry', (id) => manager.retry(id));
  h('jobs:remove', (id) => manager.remove(id));
  h('jobs:clearFinished', () => manager.clearFinished());
  h('jobs:reveal', (id) => { const j = manager.get(id); revealFile(j?.files?.[j.files.length - 1]); });
  h('jobs:open', (id) => {
    const f = manager.get(id)?.files?.slice(-1)[0];
    if (f && fs.existsSync(f)) shell.openPath(f); else openDownloadsDir();
  });

  h('shell:openDownloads', () => openDownloadsDir());
  h('shell:openLog', () => shell.openPath(P.LOG_FILE));
  h('shell:openExternal', (url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  manager = new DownloadManager();
  manager.on('job', (job) => { send('jobs:update', job); updateTaskbar(); updateTray(); });
  manager.on('list', (list) => { send('jobs:list', list); updateTaskbar(); updateTray(); });
  manager.on('completed', (job) => notify(job, true));
  manager.on('failed', (job) => notify(job, false));
  tools.events.on('status', (s) => { send('tools:status', s); if (s.ytdlp && !s.busy) manager.pump(); });

  lockDownPermissions();
  registerIpc();
  createWindow();
  createTray();

  server = createServer({
    version: VERSION,
    onDownload: ({ url, options, title }) => {
      const r = manager.add({ url, options, preview: title ? { title } : null });
      if (r.ok) send('external:added', { id: r.id });
      return r;
    },
  });
  await server.start();

  // Tools: install whatever is missing, then keep yt-dlp fresh (sites change constantly).
  await tools.ensure();
  if (tools.ytdlp) manager.pump();
  else manager.failQueued('no-ytdlp', tools.status().error || 'yt-dlp is not installed');
  tools.update().then(() => manager.pump());

  const link = protocolArg(process.argv);
  if (link) handleProtocolUrl(link);
});

app.on('before-quit', () => {
  quitting = true;
  manager?.shutdown();
  if (manager) store.saveHistory(true, manager.list());
  server?.stop();
});

app.on('window-all-closed', () => {
  // Keep running in the tray unless closing to tray is off.
  if (!getSettings().closeToTray) { quitting = true; app.quit(); }
});

app.on('activate', showWindow);
