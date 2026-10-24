'use strict';
// Download queue: probing, scheduling, progress, cancellation.
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { EventEmitter } = require('events');
const tools = require('./tools');
const { log, getSettings, loadHistory, saveHistory, HISTORY_CAP } = require('./store');
const Y = require('./ytdlp');

const ACTIVE = ['queued', 'downloading', 'processing'];
const URL_RE = /^https?:\/\/[^\s]+$/i;

class DownloadManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = loadHistory();   // newest first; history and queue are one list
    this.procs = new Map();      // id → child process
    this.trackers = new Map();
    this.throttle = new Map();
  }

  list() { return this.jobs; }
  get(id) { return this.jobs.find(j => j.id === id); }
  activeCount() { return this.jobs.filter(j => j.status === 'downloading' || j.status === 'processing').length; }

  // ── Probe: fetch title / thumbnail / formats before downloading ────────────
  probe(url, { playlist = false } = {}) {
    return new Promise((resolve) => {
      if (!URL_RE.test(url)) return resolve({ ok: false, error: 'invalid-url' });
      if (!tools.ytdlp) return resolve({ ok: false, error: 'no-ytdlp' });
      const s = getSettings();
      const args = ['-J', '--no-warnings', '--encoding', 'utf-8', playlist ? '--flat-playlist' : '--no-playlist'];
      if (playlist) args.push('--yes-playlist');
      if (s.cookiesFromBrowser) args.push('--cookies-from-browser', s.cookiesFromBrowser);
      args.push('--', url);
      if (this.probeProc) { try { this.probeProc.kill(); } catch {} }
      const p = execFile(tools.ytdlp, args, { timeout: 45000, maxBuffer: 64 * 1024 * 1024, windowsHide: true, env: tools.utf8Env() },
        (err, stdout, stderr) => {
          if (this.probeProc === p) this.probeProc = null;
          if (err && !stdout) {
            if (err.killed) return resolve({ ok: false, error: 'cancelled' });
            const message = Y.parseError(stderr) || err.message;
            return resolve({ ok: false, error: Y.classifyError(message), message });
          }
          try {
            const info = Y.summarizeInfo(JSON.parse(stdout));
            if (info?.kind === 'video') info.buckets = Y.bucketsFor(info.heights);
            resolve({ ok: true, info });
          } catch (e) {
            resolve({ ok: false, error: 'unknown', message: e.message });
          }
        });
      this.probeProc = p;
    });
  }

  // ── Queue ──────────────────────────────────────────────────────────────────
  add({ url, options = {}, preview = null }) {
    url = String(url || '').trim();
    if (!URL_RE.test(url)) return { ok: false, error: 'invalid-url' };
    const job = {
      id: crypto.randomUUID(),
      url,
      title: preview?.title || url,
      thumbnail: preview?.thumbnail || null,
      uploader: preview?.uploader || null,
      duration: preview?.duration || null,
      options: {
        quality: String(options.quality || getSettings().quality),
        audioOnly: !!options.audioOnly,
        playlist: !!options.playlist,
        subtitles: !!options.subtitles,
        thumbnail: !!options.thumbnail,
      },
      status: 'queued',
      progress: 0, speed: null, eta: null, downloadedBytes: 0, totalBytes: null,
      item: null, files: [], error: null, errorKind: null,
      createdAt: new Date().toISOString(), finishedAt: null,
    };
    this.jobs.unshift(job);
    if (this.jobs.length > HISTORY_CAP) this.jobs.length = HISTORY_CAP;
    this.changed(job, true);
    this.pump();
    return { ok: true, id: job.id };
  }

  retry(id) {
    const job = this.get(id);
    if (!job || ACTIVE.includes(job.status)) return false;
    Object.assign(job, { status: 'queued', progress: 0, error: null, errorKind: null, speed: null, eta: null, finishedAt: null, files: [] });
    this.jobs = [job, ...this.jobs.filter(j => j !== job)];
    this.changed(job, true);
    this.pump();
    return true;
  }

  cancel(id) {
    const job = this.get(id);
    if (!job) return false;
    const proc = this.procs.get(id);
    job.status = 'cancelled';
    job.finishedAt = new Date().toISOString();
    if (proc) { proc.__cancelled = true; killTree(proc); }
    this.changed(job, true);
    this.pump();
    return true;
  }

  remove(id) {
    const job = this.get(id);
    if (!job) return false;
    if (ACTIVE.includes(job.status)) this.cancel(id);
    this.jobs = this.jobs.filter(j => j.id !== id);
    saveHistory(false, this.jobs);
    this.emit('list', this.jobs);
    return true;
  }

  clearFinished() {
    this.jobs = this.jobs.filter(j => ACTIVE.includes(j.status));
    saveHistory(true, this.jobs);
    this.emit('list', this.jobs);
  }

  cancelAll() {
    for (const j of this.jobs) if (ACTIVE.includes(j.status)) this.cancel(j.id);
  }

  /** Engine could not be installed: fail whatever is waiting so the user sees why. */
  failQueued(kind, message) {
    for (const j of this.jobs) if (j.status === 'queued') this.fail(j, kind, message);
  }

  /** App is quitting: stop processes but keep jobs retryable. */
  shutdown() {
    for (const [id, proc] of this.procs) {
      const job = this.get(id);
      if (job) job.status = 'interrupted';
      proc.__cancelled = true;
      killTree(proc);
    }
    for (const j of this.jobs) if (j.status === 'queued') j.status = 'interrupted';
    this.procs.clear();
  }

  pump() {
    if (!tools.ytdlp) return; // jobs wait in the queue until the engine is installed
    const max = getSettings().maxConcurrent;
    let running = this.jobs.filter(j => j.status === 'downloading' || j.status === 'processing').length;
    // Oldest queued first (list is newest-first).
    const queued = this.jobs.filter(j => j.status === 'queued').reverse();
    for (const job of queued) {
      if (running >= max) break;
      this.start(job);
      running++;
    }
  }

  // ── Run one job ────────────────────────────────────────────────────────────
  start(job) {
    if (!tools.ytdlp) {
      return this.fail(job, 'no-ytdlp', 'yt-dlp is not installed');
    }
    const settings = getSettings();
    try { fs.mkdirSync(settings.downloadsDir, { recursive: true }); }
    catch (e) { return this.fail(job, 'folder', e.message); }

    const args = Y.buildArgs(job, settings, { ffmpegDir: tools.ffmpegDir });
    log('start', job.id, job.url, JSON.stringify(job.options));

    job.status = 'downloading';
    job.progress = 0;
    job.files = [];
    const tracker = new Y.ProgressTracker();
    this.trackers.set(job.id, tracker);

    const proc = spawn(tools.ytdlp, args, { windowsHide: true, env: tools.utf8Env(), detached: process.platform !== 'win32' });
    this.procs.set(job.id, proc);
    this.changed(job, true);

    let stderr = '';
    let buf = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        this.onLine(job, tracker, buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
    });
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (d) => { stderr = (stderr + d).slice(-8000); });

    proc.on('error', (e) => this.finish(job, proc, -1, e.message));
    proc.on('close', (code) => {
      if (buf) this.onLine(job, tracker, buf);
      this.finish(job, proc, code, stderr);
    });
  }

  onLine(job, tracker, line) {
    const ev = Y.parseLine(line);
    if (!ev) return;
    if (ev.type === 'meta') {
      const m = ev.meta || {};
      if (job.options.playlist) {
        job.item = { index: m.playlist_index || null, count: m.n_entries || null, title: m.title || null };
        if (m.playlist_title && (!job.title || job.title === job.url)) job.title = m.playlist_title;
        tracker.reset();
      } else {
        if (m.title) job.title = m.title;
        if (m.uploader) job.uploader = m.uploader;
        if (m.duration) job.duration = m.duration;
      }
      if (m.thumbnail && !job.thumbnail) job.thumbnail = m.thumbnail;
      tracker.setExpected(m.filesize_approx);
      job.status = 'downloading';
      this.changed(job, true);
    } else if (ev.type === 'progress') {
      const p = tracker.update(ev);
      job.downloadedBytes = p.downloadedBytes;
      job.totalBytes = p.totalBytes;
      job.speed = ev.speed;
      job.eta = ev.eta;
      if (job.options.playlist && job.item?.count) {
        const done = (job.item.index || 1) - 1;
        job.progress = Math.min(99, ((done + p.progress / 100) / job.item.count) * 100);
      } else {
        job.progress = p.progress;
      }
      // After a stream finishes ffmpeg may still need to merge / convert.
      if (ev.status === 'finished') { job.status = 'processing'; job.speed = null; job.eta = null; this.changed(job, true); }
      else { if (job.status === 'processing') job.status = 'downloading'; this.changed(job); }
    } else if (ev.type === 'file') {
      if (ev.filepath && !job.files.includes(ev.filepath)) job.files.push(ev.filepath);
      this.changed(job, true);
    }
  }

  finish(job, proc, code, stderr) {
    if (this.procs.get(job.id) !== proc) return; // already handled
    this.procs.delete(job.id);
    this.trackers.delete(job.id);
    if (proc.__cancelled || job.status === 'cancelled') {
      job.status = 'cancelled';
    } else if (code === 0) {
      job.status = 'completed';
      job.progress = 100;
      job.speed = null; job.eta = null;
      job.finishedAt = new Date().toISOString();
      log('done', job.id, job.files.join(' | '));
      this.emit('completed', job);
    } else {
      const message = (code === -1 ? stderr : Y.parseError(stderr)) || `yt-dlp exited with code ${code}`;
      log('failed', job.id, code, message);
      return this.fail(job, Y.classifyError(message), message);
    }
    this.changed(job, true);
    this.pump();
  }

  fail(job, kind, message) {
    job.status = 'error';
    job.errorKind = kind;
    job.error = message;
    job.speed = null; job.eta = null;
    job.finishedAt = new Date().toISOString();
    this.changed(job, true);
    this.emit('failed', job);
    this.pump();
  }

  // Throttled change notification (progress lines can arrive dozens per second).
  changed(job, immediate = false) {
    const now = Date.now();
    const last = this.throttle.get(job.id) || 0;
    if (!immediate && now - last < 150) return;
    this.throttle.set(job.id, now);
    if (immediate || job.status !== 'downloading') saveHistory(false, this.jobs);
    this.emit('job', { ...job });
  }
}

function killTree(proc) {
  try {
    if (process.platform === 'win32') {
      // yt-dlp spawns ffmpeg; kill the whole tree or ffmpeg keeps running.
      execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true }, () => {});
    } else {
      process.kill(-proc.pid, 'SIGTERM');
    }
  } catch {
    try { proc.kill(); } catch {}
  }
}

module.exports = { DownloadManager, URL_RE };
