'use strict';
// Run with: npm test   (plain Node test runner, no Electron needed)
const test = require('node:test');
const assert = require('node:assert/strict');
const Y = require('../electron/ytdlp');

const settings = {
  downloadsDir: '/tmp/tmv', filenameTemplate: '%(title)s.%(ext)s', audioFormat: 'mp3',
  container: 'mp4', preferCompatible: true, embedMetadata: true, subLangs: 'pl,en',
  speedLimit: '', cookiesFromBrowser: '',
};
const job = (options) => ({ url: 'https://example.com/v', options });

test('video download uses format sorting capped at chosen height', () => {
  const a = Y.buildArgs(job({ quality: '1080' }), settings, { ffmpegDir: '/ff' });
  assert.equal(a[a.indexOf('-S') + 1], 'res:1080,vcodec:h264,acodec:m4a');
  assert.equal(a[a.indexOf('--merge-output-format') + 1], 'mp4');
  assert.equal(a[a.length - 1], 'https://example.com/v');
  assert.equal(a[a.length - 2], '--', 'URL must follow -- so it can never be read as an option');
});

test('without ffmpeg only pre-muxed formats are requested', () => {
  const a = Y.buildArgs(job({ quality: '720' }), settings, {});
  assert.equal(a[a.indexOf('-f') + 1], 'b[height<=720]/b');
  assert.ok(!a.includes('--merge-output-format'));
});

test('audio mode extracts to the configured format', () => {
  const a = Y.buildArgs(job({ audioOnly: true }), { ...settings, audioFormat: 'opus' }, { ffmpegDir: '/ff' });
  assert.equal(a[a.indexOf('--audio-format') + 1], 'opus');
  assert.ok(a.includes('-x'));
});

test('playlist mode nests files in a folder', () => {
  const a = Y.buildArgs(job({ playlist: true }), settings, { ffmpegDir: '/ff' });
  assert.ok(a.includes('--yes-playlist'));
  assert.match(a[a.indexOf('-o') + 1], /playlist_index/);
});

test('progress lines parse, NA becomes null', () => {
  const line = Y.MARK.progress + ['downloading', '500', 'NA', '1000', '2048.5', '3', '137', 'NA', 'NA'].join('\t');
  const e = Y.parseLine(line + '\r');
  assert.deepEqual(
    { s: e.status, d: e.downloaded, t: e.total, sp: e.speed, eta: e.eta, f: e.formatId },
    { s: 'downloading', d: 500, t: 1000, sp: 2048.5, eta: 3, f: '137' },
  );
});

test('meta and file lines parse', () => {
  assert.equal(Y.parseLine(Y.MARK.meta + '{"title":"Zażółć"}').meta.title, 'Zażółć');
  assert.equal(Y.parseLine(Y.MARK.file + 'C:\\x\\a.mp4').filepath, 'C:\\x\\a.mp4');
  assert.equal(Y.parseLine('[download] noise'), null);
});

test('progress never goes backwards across video + audio streams', () => {
  const tr = new Y.ProgressTracker();
  tr.setExpected(1000);
  const p = (f, d, t, st = 'downloading') => tr.update({ formatId: f, downloaded: d, total: t, status: st }).progress;
  assert.equal(Math.round(p('v', 450, 900)), 45);
  assert.equal(Math.round(p('v', 900, 900, 'finished')), 90);
  assert.ok(p('a', 10, 100) >= 90);
  assert.equal(Math.round(p('a', 100, 100, 'finished')), 99);
});

test('errors are classified into actionable kinds', () => {
  assert.equal(Y.classifyError("Sign in to confirm you're not a bot"), 'auth');
  assert.equal(Y.classifyError('Unsupported URL: https://x'), 'unsupported');
  assert.equal(Y.classifyError('HTTP Error 403: Forbidden'), 'outdated');
  assert.equal(Y.parseError('WARNING: x\nERROR: [youtube] abc: Video unavailable'), 'Video unavailable');
});

test('info summary buckets heights and adds audio size to video-only formats', () => {
  const s = Y.summarizeInfo({
    id: 'a', title: 'T', duration: 60,
    formats: [
      { format_id: 'a1', vcodec: 'none', acodec: 'opus', filesize: 100 },
      { format_id: 'v1', vcodec: 'avc1', acodec: 'none', height: 1080, filesize: 1000 },
      { format_id: 'v2', vcodec: 'vp9', acodec: 'none', height: 720, filesize: 500 },
      { format_id: 'v3', vcodec: 'avc1', acodec: 'none', height: 1012, filesize: 900 },
    ],
  });
  assert.equal(s.heights[0].size, 1100);
  assert.deepEqual(Y.bucketsFor(s.heights), [1080, 720]);
});

test('playlist summary', () => {
  const s = Y.summarizeInfo({ _type: 'playlist', title: 'P', entries: [{}, {}, {}] });
  assert.equal(s.kind, 'playlist');
  assert.equal(s.count, 3);
});
