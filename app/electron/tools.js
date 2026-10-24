'use strict';
// Locates, installs and updates yt-dlp and ffmpeg.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { EventEmitter } = require('events');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { net } = require('electron');
const P = require('./paths');
const { log, getSettings, setSettings } = require('./store');

const YTDLP_ASSET = P.IS_WIN ? 'yt-dlp.exe' : P.IS_MAC ? 'yt-dlp_macos' : (process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux');
const YTDLP_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
const FFMPEG_SOURCES = P.IS_WIN
  ? [
      'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
      'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    ]
  : (!P.IS_MAC && process.arch === 'x64')
    ? ['https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz']
    : [];

// Use the Windows binaries explicitly — Git-for-Windows' GNU tar on PATH can't read C:\ paths or zips.
const SYSROOT = process.env.SystemRoot || 'C:\\Windows';
const SYS_TAR = P.IS_WIN ? path.join(SYSROOT, 'System32', 'tar.exe') : 'tar';
const SYS_PS = path.join(SYSROOT, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

const UPDATE_EVERY_MS = 24 * 3600 * 1000;

const events = new EventEmitter();
const state = {
  ytdlp: null, ffmpegDir: null, ytdlpVersion: null, ffmpegVersion: null,
  busy: false, task: null, pct: 0, error: null,
};
const emit = () => events.emit('status', status());
function status() {
  return {
    ytdlp: !!state.ytdlp, ffmpeg: !!state.ffmpegDir,
    ytdlpVersion: state.ytdlpVersion, ffmpegVersion: state.ffmpegVersion,
    ytdlpSource: state.ytdlp && state.ytdlp !== P.YTDLP_LOCAL ? 'system' : 'bundled',
    busy: state.busy, task: state.task, pct: state.pct, error: state.error,
    canAutoInstallFfmpeg: FFMPEG_SOURCES.length > 0,
  };
}
function setTask(task, pct = 0) { state.task = task; state.pct = pct; emit(); }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function run(file, args, timeout = 60000) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout, windowsHide: true, env: utf8Env() }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, killed: !!err?.killed, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}
function utf8Env() {
  return { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };
}
function which(name) {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  if (P.IS_MAC) dirs.push('/opt/homebrew/bin', '/usr/local/bin');
  for (const d of dirs) {
    if (!d) continue;
    const full = path.join(d, name + P.EXE);
    try { if (fs.statSync(full).isFile()) return full; } catch {}
  }
  return null;
}

// Streams to a temp file with an idle timeout; any network/disk error rejects (never hangs).
async function download(url, dest, label) {
  log('download', url);
  const ctrl = new AbortController();
  let idle;
  const kick = () => { clearTimeout(idle); idle = setTimeout(() => ctrl.abort(new Error('download stalled')), 60000); };
  kick();
  const tmp = dest + '.download';
  try {
    const res = await net.fetch(url, { headers: { 'User-Agent': 'TouchMyVideo/2' }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    const total = Number(res.headers.get('content-length')) || 0;
    let got = 0, lastEmit = 0;
    const meter = new Transform({
      transform(chunk, _enc, cb) {
        kick();
        got += chunk.length;
        const now = Date.now();
        if (total && now - lastEmit > 150) { lastEmit = now; setTask(label, Math.round((got / total) * 100)); }
        cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(res.body), meter, fs.createWriteStream(tmp), { signal: ctrl.signal });
    await renameRetry(tmp, dest);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch {}
    throw e;
  } finally {
    clearTimeout(idle);
  }
}

// Antivirus / indexers briefly lock freshly written files on Windows.
async function renameRetry(from, to) {
  for (let i = 0; ; i++) {
    try { return fs.renameSync(from, to); }
    catch (e) {
      if (i >= 8 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      await new Promise(r => setTimeout(r, 250));
    }
  }
}

async function fetchText(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'TouchMyVideo/2' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', d => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
  });
}

function extract(archive, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const viaTar = () => new Promise((resolve, reject) => {
    const p = spawn(SYS_TAR, ['-xf', archive, '-C', destDir], { windowsHide: true });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', c => (c === 0 ? resolve() : reject(new Error('tar: ' + err.slice(0, 200)))));
  });
  const viaPowershell = () => new Promise((resolve, reject) => {
    const q = (s) => "'" + s.replace(/'/g, "''") + "'";
    const p = spawn(SYS_PS, ['-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath ${q(archive)} -DestinationPath ${q(destDir)} -Force`], { windowsHide: true });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', c => (c === 0 ? resolve() : reject(new Error('Expand-Archive: ' + err.slice(0, 200)))));
  });
  // Windows 10+ ships bsdtar, which unpacks zip much faster than Expand-Archive.
  return viaTar().catch(e => { if (P.IS_WIN) return viaPowershell(); throw e; });
}

function findFile(dir, name) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { const r = findFile(full, name); if (r) return r; }
    else if (e.name === name) return full;
  }
  return null;
}

// ─── Detection ───────────────────────────────────────────────────────────────
async function detect() {
  // Prefer our own copy (we can keep it updated), fall back to PATH.
  state.ytdlp = fs.existsSync(P.YTDLP_LOCAL) ? P.YTDLP_LOCAL : which('yt-dlp');
  const localFfmpeg = fs.existsSync(P.FFMPEG_LOCAL) ? P.TOOLS_DIR : null;
  const sysFfmpeg = which('ffmpeg');
  state.ffmpegDir = localFfmpeg || (sysFfmpeg ? path.dirname(sysFfmpeg) : null);

  state.ytdlpVersion = null;
  state.ffmpegVersion = null;
  if (state.ytdlp) {
    const r = await run(state.ytdlp, ['--version'], 90000);
    if (r.ok) state.ytdlpVersion = r.stdout.trim();
    else if (r.code === 'ETIMEDOUT' || r.killed) log('yt-dlp --version timed out; keeping it');
    else { log('yt-dlp --version failed', r.stderr.slice(0, 200)); state.ytdlp = null; }
  }
  if (state.ffmpegDir) {
    const r = await run(path.join(state.ffmpegDir, 'ffmpeg' + P.EXE), ['-version'], 60000);
    const m = r.stdout.match(/ffmpeg version (\S+)/);
    state.ffmpegVersion = m ? m[1].slice(0, 24) : null;
    if (!r.ok && !r.killed) state.ffmpegDir = null;
  }
  emit();
  return status();
}

// ─── Install / update ────────────────────────────────────────────────────────
async function installYtdlp() {
  fs.mkdirSync(P.TOOLS_DIR, { recursive: true });
  setTask('ytdlp', 0);
  const tmpTarget = P.YTDLP_LOCAL + '.new';
  await download(YTDLP_BASE + YTDLP_ASSET, tmpTarget, 'ytdlp');
  // Verify against the official checksum list.
  try {
    const sums = await fetchText(YTDLP_BASE + 'SHA2-256SUMS');
    const line = sums.split('\n').find(l => l.trim().endsWith(' ' + YTDLP_ASSET));
    const expected = line?.split(/\s+/)[0];
    const actual = await sha256(tmpTarget);
    if (expected && expected !== actual) {
      fs.unlinkSync(tmpTarget);
      throw new Error('yt-dlp checksum mismatch');
    }
  } catch (e) {
    if (/checksum mismatch/.test(e.message)) throw e;
    log('checksum check skipped:', e.message);
  }
  await renameRetry(tmpTarget, P.YTDLP_LOCAL);
  setSettings({ lastYtdlpUpdate: Date.now() }); // fresh download is already the latest
  if (!P.IS_WIN) fs.chmodSync(P.YTDLP_LOCAL, 0o755);
  log('yt-dlp installed');
}

async function installFfmpeg() {
  if (!FFMPEG_SOURCES.length) throw new Error('ffmpeg-manual');
  fs.mkdirSync(P.TOOLS_DIR, { recursive: true });
  let lastErr;
  for (const url of FFMPEG_SOURCES) {
    const archive = path.join(P.TOOLS_DIR, url.endsWith('.zip') ? 'ffmpeg.zip' : 'ffmpeg.tar.xz');
    const exDir = path.join(P.TOOLS_DIR, 'ffmpeg_ex');
    try {
      setTask('ffmpeg', 0);
      await download(url, archive, 'ffmpeg');
      setTask('extract', 100);
      fs.rmSync(exDir, { recursive: true, force: true });
      await extract(archive, exDir);
      for (const name of ['ffmpeg', 'ffprobe']) {
        const found = findFile(exDir, name + P.EXE);
        if (!found) throw new Error(name + ' not found in archive');
        fs.copyFileSync(found, path.join(P.TOOLS_DIR, name + P.EXE));
        if (!P.IS_WIN) fs.chmodSync(path.join(P.TOOLS_DIR, name + P.EXE), 0o755);
      }
      log('ffmpeg installed from', url);
      return;
    } catch (e) {
      lastErr = e;
      log('ffmpeg source failed', url, e.message);
    } finally {
      try { fs.unlinkSync(archive); } catch {}
      try { fs.rmSync(exDir, { recursive: true, force: true }); } catch {}
    }
  }
  throw lastErr;
}

async function guard(fn) {
  if (state.busy) return status();
  state.busy = true; state.error = null; emit();
  try { await fn(); }
  catch (e) { state.error = e.message; log('tools error', e.message); }
  finally { state.busy = false; state.task = null; await detect(); }
  return status();
}

/** Install anything missing. Called on startup. */
function ensure() {
  return guard(async () => {
    await detect();
    if (!state.ytdlp) await installYtdlp();
    if (!state.ffmpegDir && FFMPEG_SOURCES.length) await installFfmpeg();
  });
}

/** Update yt-dlp via its built-in updater (our copy only). */
function update({ force = false } = {}) {
  const s = getSettings();
  if (!force && (!s.autoUpdateYtdlp || Date.now() - s.lastYtdlpUpdate < UPDATE_EVERY_MS)) return Promise.resolve(status());
  if (!fs.existsSync(P.YTDLP_LOCAL)) return Promise.resolve(status());
  return guard(async () => {
    setTask('update', 0);
    const r = await run(P.YTDLP_LOCAL, ['-U'], 180000);
    log('yt-dlp -U:', (r.stdout + r.stderr).trim().slice(0, 300));
    if (!r.ok) throw new Error('update-failed');
    setSettings({ lastYtdlpUpdate: Date.now() });
  });
}

/** Wipe and re-download our copies. */
function repair() {
  return guard(async () => {
    for (const f of [P.YTDLP_LOCAL, P.FFMPEG_LOCAL, P.FFPROBE_LOCAL]) { try { fs.unlinkSync(f); } catch {} }
    await installYtdlp();
    if (FFMPEG_SOURCES.length) await installFfmpeg();
    setSettings({ lastYtdlpUpdate: Date.now() });
  });
}

module.exports = {
  events, status, detect, ensure, update, repair, utf8Env,
  get ytdlp() { return state.ytdlp; },
  get ffmpegDir() { return state.ffmpegDir; },
  get busy() { return state.busy; },
};
