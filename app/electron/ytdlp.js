'use strict';
// Pure helpers around yt-dlp: argument building, output parsing, info summarising.
// No Electron imports here, so everything is unit-testable with plain Node.

const path = require('path');

const MARK = {
  progress: 'TMV_P ',
  meta: 'TMV_M ',
  file: 'TMV_F ',
};

// Fields are separated by \t; yt-dlp prints "NA" for missing values.
const PROGRESS_TEMPLATE =
  'download:' + MARK.progress + [
    '%(progress.status)s',
    '%(progress.downloaded_bytes)s',
    '%(progress.total_bytes)s',
    '%(progress.total_bytes_estimate)s',
    '%(progress.speed)s',
    '%(progress.eta)s',
    '%(info.format_id)s',
    '%(progress.fragment_index)s',
    '%(progress.fragment_count)s',
  ].join('\t');

const META_PRINT =
  'before_dl:' + MARK.meta + '%(.{id,title,thumbnail,uploader,duration,playlist_index,n_entries,playlist_title,filesize_approx,format_id})j';

const FILE_PRINT = 'after_move:' + MARK.file + '%(filepath)s';

const num = (v) => {
  if (v === undefined || v === null || v === 'NA' || v === 'None' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Build yt-dlp arguments for a job.
 * @param {object} job       { url, options: { quality, audioOnly, playlist, subtitles, thumbnail } }
 * @param {object} settings  persisted settings
 * @param {object} tools     { ffmpegDir: string|null }
 */
function buildArgs(job, settings, tools = {}) {
  const o = job.options || {};
  const quality = o.quality || settings.quality || 'best';
  const hasFfmpeg = !!tools.ffmpegDir;

  const args = [
    '--newline', '--quiet', '--progress', '--no-simulate', '--no-warnings',
    '--progress-template', PROGRESS_TEMPLATE,
    '--print', META_PRINT,
    '--print', FILE_PRINT,
    '--windows-filenames', '--trim-filenames', '180',
    '--no-mtime',
    '--concurrent-fragments', '4',
    '--retries', '10', '--fragment-retries', '10',
    '--encoding', 'utf-8',
  ];

  if (hasFfmpeg) args.push('--ffmpeg-location', tools.ffmpegDir);

  args.push(o.playlist ? '--yes-playlist' : '--no-playlist');

  if (o.audioOnly) {
    args.push('-f', 'ba/b');
    if (hasFfmpeg) {
      args.push('-x', '--audio-format', settings.audioFormat || 'mp3', '--audio-quality', '0');
      if (['mp3', 'm4a', 'opus', 'flac'].includes(settings.audioFormat || 'mp3')) args.push('--embed-thumbnail');
    }
  } else if (hasFfmpeg) {
    // Format sorting is far more robust than hand-written selectors:
    // "res:1080" = the largest resolution that is not above 1080p.
    const sort = [];
    if (quality !== 'best') sort.push('res:' + quality);
    if (settings.preferCompatible && settings.container !== 'mkv') sort.push('vcodec:h264', 'acodec:m4a');
    args.push('-f', 'bv*+ba/b');
    if (sort.length) args.push('-S', sort.join(','));
    args.push('--merge-output-format', settings.container || 'mp4');
  } else {
    // Without ffmpeg only pre-muxed (video+audio in one file) formats work.
    args.push('-f', 'b');
    if (quality !== 'best') args.push('-S', 'res:' + quality);
  }

  if (hasFfmpeg && settings.embedMetadata) args.push('--embed-metadata');

  if (o.subtitles && !o.audioOnly) {
    args.push('--write-subs', '--write-auto-subs', '--sub-langs', settings.subLangs || 'pl,en');
    if (hasFfmpeg) args.push('--embed-subs');
  }

  if (o.thumbnail) {
    args.push('--write-thumbnail');
    if (hasFfmpeg) args.push('--convert-thumbnails', 'jpg');
  }

  if (settings.speedLimit) args.push('--limit-rate', settings.speedLimit);
  if (settings.cookiesFromBrowser) args.push('--cookies-from-browser', settings.cookiesFromBrowser);

  const template = o.playlist
    ? path.join('%(playlist_title,playlist_id)s', '%(playlist_index)03d - ' + settings.filenameTemplate)
    : settings.filenameTemplate;
  args.push('-P', settings.downloadsDir, '-o', template);

  args.push('--', job.url);
  return args;
}

/** Turn one stdout line into a structured event (or null). */
function parseLine(line) {
  if (!line) return null;
  line = line.replace(/\r$/, '');

  if (line.startsWith(MARK.progress)) {
    const f = line.slice(MARK.progress.length).split('\t');
    return {
      type: 'progress',
      status: f[0],
      downloaded: num(f[1]),
      total: num(f[2]) ?? num(f[3]),
      speed: num(f[4]),
      eta: num(f[5]),
      formatId: f[6] && f[6] !== 'NA' ? f[6] : 'x',
      fragIndex: num(f[7]),
      fragCount: num(f[8]),
    };
  }
  if (line.startsWith(MARK.meta)) {
    try { return { type: 'meta', meta: JSON.parse(line.slice(MARK.meta.length)) }; }
    catch { return null; }
  }
  if (line.startsWith(MARK.file)) {
    return { type: 'file', filepath: line.slice(MARK.file.length).trim() };
  }
  return null;
}

/** Extract the human-readable reason from yt-dlp stderr. */
function parseError(stderr) {
  const lines = String(stderr).split(/\r?\n/).filter(Boolean);
  const err = [...lines].reverse().find(l => l.startsWith('ERROR:'));
  const msg = (err || lines[lines.length - 1] || '').replace(/^ERROR:\s*/, '').replace(/^\[[^\]]+\]\s*[\w-]+:\s*/, '');
  return msg.trim().slice(0, 400);
}

/** Classify common failures so the UI can say what to do about them. */
function classifyError(message) {
  const m = (message || '').toLowerCase();
  // Order matters: specific causes first, generic "unable to download" last.
  if (/requested format is not available/.test(m)) return 'format';
  if (/sign in to confirm|confirm you.?re not a bot|login required|private video|members-only|cookies/.test(m)) return 'auth';
  if (/http error 403|forbidden|nsig|signature extraction/.test(m)) return 'outdated';
  if (/unsupported url/.test(m)) return 'unsupported';
  if (/video unavailable|is not available|has been removed|\b404\b/.test(m)) return 'unavailable';
  if (/ffmpeg|ffprobe/.test(m)) return 'ffmpeg';
  if (/unable to download|timed out|connection|network|getaddrinfo|ssl/.test(m)) return 'network';
  return 'unknown';
}

/**
 * Tracks overall progress across several streams (video + audio are separate downloads).
 * Uses the merged size estimate when known so the bar never resets between streams.
 */
class ProgressTracker {
  constructor() { this.streams = new Map(); this.expected = null; this.shown = 0; }
  setExpected(bytes) { if (bytes && bytes > 0) this.expected = bytes; }
  reset() { this.streams.clear(); this.expected = null; this.shown = 0; }
  update(ev) {
    const prev = this.streams.get(ev.formatId) || {};
    let downloaded = ev.downloaded ?? prev.downloaded ?? 0;
    let total = ev.total ?? prev.total ?? null;
    // Fragmented downloads (HLS/DASH) often lack byte totals but expose fragment counts.
    if (!total && ev.fragCount && ev.fragIndex) {
      this.streams.set(ev.formatId, { downloaded, total: null, frac: ev.fragIndex / ev.fragCount, finished: ev.status === 'finished' });
    } else {
      this.streams.set(ev.formatId, { downloaded, total, finished: ev.status === 'finished' });
    }
    let sumDl = 0, sumTotal = 0, fracs = [], unknown = false;
    for (const s of this.streams.values()) {
      sumDl += s.downloaded || 0;
      if (s.total) sumTotal += s.total;
      else if (s.frac !== undefined) fracs.push(s.frac);
      else unknown = true;
    }
    let pct;
    if (this.expected && this.expected >= sumDl) pct = (sumDl / this.expected) * 100;
    else if (sumTotal && !fracs.length && !unknown) pct = (sumDl / sumTotal) * 100;
    else if (fracs.length) pct = (fracs.reduce((a, b) => a + b, 0) / fracs.length) * 100;
    else pct = this.shown;
    pct = Math.min(99, Math.max(this.shown, pct)); // monotonic; 100 only on real completion
    this.shown = pct;
    return { progress: pct, downloadedBytes: sumDl, totalBytes: this.expected || sumTotal || null };
  }
}

/** Summarise `yt-dlp -J` output into what the preview card needs. */
function summarizeInfo(info) {
  if (!info || typeof info !== 'object') return null;
  if (info._type === 'playlist' || Array.isArray(info.entries)) {
    const entries = (info.entries || []).filter(Boolean);
    const thumb = info.thumbnails?.length ? info.thumbnails[info.thumbnails.length - 1].url : (entries[0]?.thumbnails?.[0]?.url || null);
    return {
      kind: 'playlist',
      id: info.id,
      title: info.title || 'Playlist',
      uploader: info.uploader || info.channel || null,
      thumbnail: thumb,
      count: info.playlist_count || entries.length,
      extractor: info.extractor_key || info.extractor || null,
    };
  }
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const bestAudio = formats
    .filter(f => f.vcodec === 'none' && f.acodec && f.acodec !== 'none')
    .reduce((best, f) => ((f.filesize || f.filesize_approx || 0) > (best?.filesize || best?.filesize_approx || 0) ? f : best), null);
  const audioSize = bestAudio ? (bestAudio.filesize || bestAudio.filesize_approx || 0) : 0;

  const byHeight = new Map();
  for (const f of formats) {
    if (!f.height || !f.vcodec || f.vcodec === 'none') continue;
    // yt-dlp's "res" sort uses the smaller side, so a 1080x1920 Short counts as 1080p.
    const h = f.width ? Math.min(f.width, f.height) : f.height;
    const size = (f.filesize || f.filesize_approx || 0) + (f.acodec === 'none' ? audioSize : 0);
    const cur = byHeight.get(h);
    if (!cur || size > cur.size) byHeight.set(h, { height: h, size: size || null, fps: f.fps || null });
  }
  const heights = [...byHeight.values()].sort((a, b) => b.height - a.height);

  return {
    kind: 'video',
    id: info.id,
    title: info.title || info.id,
    uploader: info.uploader || info.channel || info.creator || null,
    duration: info.duration || null,
    thumbnail: info.thumbnail || null,
    isLive: !!info.is_live,
    extractor: info.extractor_key || info.extractor || null,
    heights,
    audioSize: audioSize || null,
  };
}

/** Map an arbitrary height to the quality buckets the UI offers. */
const BUCKETS = [2160, 1440, 1080, 720, 480, 360];
function bucketsFor(heights) {
  const set = new Set();
  for (const h of heights || []) {
    const b = BUCKETS.find(x => h.height >= x * 0.9) || 360;
    set.add(b);
  }
  return BUCKETS.filter(b => set.has(b));
}

module.exports = {
  MARK, PROGRESS_TEMPLATE, buildArgs, parseLine, parseError, classifyError,
  ProgressTracker, summarizeInfo, bucketsFor,
};
