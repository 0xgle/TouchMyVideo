'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const P = require('./paths');

// ─── Logger (rotates at 2 MB) ────────────────────────────────────────────────
const MAX_LOG = 2 * 1024 * 1024;
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  if (P.IS_DEV || process.env.TMV_DEBUG) console.log(line);
  try {
    fs.mkdirSync(P.USER_DATA, { recursive: true });
    if (fs.existsSync(P.LOG_FILE) && fs.statSync(P.LOG_FILE).size > MAX_LOG) {
      fs.renameSync(P.LOG_FILE, P.LOG_FILE + '.old');
    }
    fs.appendFileSync(P.LOG_FILE, line + '\n');
  } catch {}
}

// Write to a temp file first, then rename — a crash mid-write never corrupts the original.
function writeJsonAtomic(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  } catch (e) { log('write error', file, e.message); }
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) { log('read error', file, e.message); }
  return fallback;
}

// ─── Settings ────────────────────────────────────────────────────────────────
function systemLanguage() {
  try { return app.getLocale().toLowerCase().startsWith('pl') ? 'pl' : 'en'; } catch { return 'en'; }
}

const DEFAULTS = {
  language: null,              // null → follow system
  downloadsDir: P.DEFAULT_DOWNLOADS_DIR,
  quality: '1080',             // 'best' | '2160' | '1440' | '1080' | '720' | '480' | '360'
  container: 'mp4',            // 'mp4' | 'mkv'
  preferCompatible: true,      // prefer H.264/AAC so files play everywhere
  audioFormat: 'mp3',          // 'mp3' | 'm4a' | 'opus' | 'flac' | 'wav'
  subtitles: false,
  subLangs: 'pl,en',
  saveThumbnail: false,
  embedMetadata: true,
  maxConcurrent: 2,
  speedLimit: '',              // '' | e.g. '5M'
  cookiesFromBrowser: '',      // '' | 'firefox' | 'chrome' | 'edge' | 'brave' | 'opera' | 'vivaldi'
  filenameTemplate: '%(title)s.%(ext)s',
  autoUpdateYtdlp: true,
  lastYtdlpUpdate: 0,
  watchClipboard: true,
  closeToTray: true,
  notifications: true,
  trayHintShown: false,
};

const ALLOWED = {
  quality: ['best', '2160', '1440', '1080', '720', '480', '360'],
  container: ['mp4', 'mkv'],
  audioFormat: ['mp3', 'm4a', 'opus', 'flac', 'wav'],
  cookiesFromBrowser: ['', 'firefox', 'chrome', 'edge', 'brave', 'opera', 'vivaldi', 'chromium', 'safari'],
  language: [null, 'pl', 'en'],
};

function sanitize(input) {
  const out = { ...DEFAULTS };
  for (const [k, def] of Object.entries(DEFAULTS)) {
    const v = input?.[k];
    if (v === undefined) continue;
    if (ALLOWED[k]) { if (ALLOWED[k].includes(v)) out[k] = v; continue; }
    if (typeof v === typeof def || (def === null)) out[k] = v;
  }
  out.maxConcurrent = Math.min(5, Math.max(1, parseInt(out.maxConcurrent, 10) || 2));
  if (!/^(\d+(\.\d+)?[KMG]?)?$/i.test(out.speedLimit)) out.speedLimit = '';
  if (!out.filenameTemplate.trim() || /[\\/]\.\.|^\.\./.test(out.filenameTemplate)) out.filenameTemplate = DEFAULTS.filenameTemplate;
  if (!out.downloadsDir || !path.isAbsolute(out.downloadsDir)) out.downloadsDir = P.DEFAULT_DOWNLOADS_DIR;
  out.subLangs = String(out.subLangs).replace(/[^a-zA-Z0-9,.*_-]/g, '') || 'pl,en';
  return out;
}

let settings = null;
function getSettings() {
  if (!settings) {
    const raw = readJson(P.SETTINGS_FILE, {});
    settings = sanitize(raw);
  }
  return settings;
}
function setSettings(patch) {
  settings = sanitize({ ...getSettings(), ...patch });
  writeJsonAtomic(P.SETTINGS_FILE, settings);
  return settings;
}
function language() {
  return getSettings().language || systemLanguage();
}

// ─── History (debounced persistence) ─────────────────────────────────────────
const HISTORY_CAP = 500;
let history = null;
let saveTimer = null;

function loadHistory() {
  if (history) return history;
  const raw = readJson(P.HISTORY_FILE, []);
  history = Array.isArray(raw) ? raw : [];
  // Anything "in flight" when the app last closed did not finish.
  for (const j of history) {
    // v1 entries: { quality: '1080p' | 'MP3', audioOnly } at the top level.
    if (!j.options) {
      const q = String(j.quality || 'best').replace(/p$/i, '').replace(/^4K$/i, '2160');
      j.options = { quality: /^\d+$/.test(q) ? q : 'best', audioOnly: !!j.audioOnly || j.quality === 'MP3' };
      j.files = j.files || [];
      j.createdAt = j.createdAt || j.timestamp;
    }
    if (['queued', 'downloading', 'processing', 'probing'].includes(j.status)) {
      j.status = 'interrupted';
    }
  }
  return history;
}
function saveHistory(now = false, list = null) {
  if (list) history = list;
  if (!history) return;
  clearTimeout(saveTimer);
  const doSave = () => writeJsonAtomic(P.HISTORY_FILE, history.slice(0, HISTORY_CAP));
  if (now) doSave(); else saveTimer = setTimeout(doSave, 800);
}

module.exports = {
  log, readJson, writeJsonAtomic,
  DEFAULTS, getSettings, setSettings, language,
  loadHistory, saveHistory, HISTORY_CAP,
};
