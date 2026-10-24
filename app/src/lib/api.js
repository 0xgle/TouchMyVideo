// Bridge to the Electron main process. In a plain browser (vite dev without Electron)
// a small in-memory mock is used so the UI can be developed and previewed on its own.

const real = typeof window !== 'undefined' ? window.tmv : null;
export const isDesktop = !!real;

function createMock() {
  const listeners = {};
  const emit = (ch, d) => (listeners[ch] || []).forEach(f => f(d));
  const on = (ch) => (cb) => { (listeners[ch] ||= []).push(cb); return () => { listeners[ch] = listeners[ch].filter(f => f !== cb); }; };
  let settings = {
    language: null, downloadsDir: 'C:\\Users\\Mateusz\\Downloads\\TouchMyVideo', quality: '1080', container: 'mp4',
    preferCompatible: true, audioFormat: 'mp3', subtitles: false, subLangs: 'pl,en', saveThumbnail: false,
    embedMetadata: true, maxConcurrent: 2, speedLimit: '', cookiesFromBrowser: '', filenameTemplate: '%(title)s.%(ext)s',
    autoUpdateYtdlp: true, watchClipboard: true, closeToTray: true, notifications: true,
  };
  const now = Date.now();
  let jobs = [
    { id: 'm1', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Big Buck Bunny 60fps 4K — Official Blender Foundation Short Film', uploader: 'Blender', duration: 634, thumbnail: null, options: { quality: '2160', audioOnly: false }, status: 'downloading', progress: 42, speed: 6.4e6, eta: 38, downloadedBytes: 2.1e8, totalBytes: 5e8, files: [], createdAt: new Date(now - 6e4).toISOString() },
    { id: 'm2', url: 'https://vimeo.com/1084537', title: 'Sintel — Open Movie by Blender Foundation', uploader: 'Blender', duration: 888, options: { quality: '1080', audioOnly: false }, status: 'queued', progress: 0, files: [], createdAt: new Date(now - 3e4).toISOString() },
    { id: 'm3', url: 'https://soundcloud.com/x/y', title: 'Nagranie z konferencji — panel o infrastrukturze', uploader: 'Stovaris', duration: 2710, options: { quality: '1080', audioOnly: true }, status: 'completed', progress: 100, files: ['C:\\x.mp3'], totalBytes: 4.3e7, createdAt: new Date(now - 36e5).toISOString(), finishedAt: new Date(now - 35e5).toISOString() },
    { id: 'm4', url: 'https://www.youtube.com/watch?v=private', title: 'https://www.youtube.com/watch?v=private', options: { quality: '720', audioOnly: false }, status: 'error', errorKind: 'auth', error: "Sign in to confirm you're not a bot", progress: 0, files: [], createdAt: new Date(now - 72e5).toISOString() },
  ];
  const tools = { ytdlp: true, ffmpeg: true, ytdlpVersion: '2026.10.21', ffmpegVersion: 'n7.1', busy: false, task: null, pct: 0, error: null, ytdlpSource: 'bundled', canAutoInstallFfmpeg: true };
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const upd = (job) => emit('jobs:update', { ...job });

  setInterval(() => {
    for (const j of jobs) {
      if (j.status !== 'downloading') continue;
      j.progress = Math.min(100, j.progress + Math.random() * 3);
      j.downloadedBytes = (j.totalBytes || 5e8) * j.progress / 100;
      if (j.progress >= 100) { j.status = 'completed'; j.finishedAt = new Date().toISOString(); j.speed = null; j.files = ['C:\\demo.mp4']; }
      upd(j);
    }
    const running = jobs.filter(j => j.status === 'downloading').length;
    const q = jobs.filter(j => j.status === 'queued').reverse()[0];
    if (q && running < settings.maxConcurrent) { q.status = 'downloading'; q.totalBytes = 3e8; q.speed = 4.2e6; q.eta = 60; upd(q); }
  }, 600);

  return {
    appInfo: async () => ({ version: '2.0.0', platform: 'win32', port: 43210 }),
    getSettings: async () => settings,
    setSettings: async (p) => (settings = { ...settings, ...p }),
    pickFolder: async () => settings,
    toolsStatus: async () => tools,
    updateTools: async () => { await delay(800); return tools; },
    repairTools: async () => { await delay(800); return tools; },
    installTools: async () => tools,
    listJobs: async () => jobs,
    probe: async (url) => {
      await delay(900);
      if (/fail/.test(url)) return { ok: false, error: 'unsupported', message: 'Unsupported URL: ' + url };
      if (/list=/.test(url)) return { ok: true, info: { kind: 'playlist', title: 'Blender Open Movies', uploader: 'Blender', count: 14, thumbnail: null } };
      return { ok: true, info: { kind: 'video', title: 'Spring — Blender Open Movie', uploader: 'Blender Studio', duration: 464, thumbnail: null, extractor: 'Youtube',
        buckets: [2160, 1440, 1080, 720, 480, 360],
        heights: [{ height: 2160, size: 9.8e8 }, { height: 1440, size: 4.6e8 }, { height: 1080, size: 2.1e8 }, { height: 720, size: 1.1e8 }, { height: 480, size: 5.2e7 }, { height: 360, size: 3.1e7 }],
        audioSize: 7.4e6 } };
    },
    addJob: async ({ url, options, preview }) => {
      const j = { id: 'm' + Math.random(), url, title: preview?.title || url, uploader: preview?.uploader, duration: preview?.duration, options, status: 'queued', progress: 0, files: [], createdAt: new Date().toISOString() };
      jobs = [j, ...jobs]; emit('jobs:list', jobs); return { ok: true, id: j.id };
    },
    cancelJob: async (id) => { const j = jobs.find(x => x.id === id); j.status = 'cancelled'; upd(j); },
    retryJob: async (id) => { const j = jobs.find(x => x.id === id); Object.assign(j, { status: 'queued', progress: 0, error: null }); upd(j); },
    removeJob: async (id) => { jobs = jobs.filter(x => x.id !== id); emit('jobs:list', jobs); },
    clearFinished: async () => { jobs = jobs.filter(j => ['queued', 'downloading', 'processing'].includes(j.status)); emit('jobs:list', jobs); },
    revealJob: async () => {}, openJob: async () => {}, openDownloads: async () => {}, openLog: async () => {},
    openExternal: async (u) => window.open(u, '_blank'),
    onJobUpdate: on('jobs:update'), onJobList: on('jobs:list'), onToolsStatus: on('tools:status'),
    onExternalUrl: on('external:url'), onExternalAdded: on('external:added'),
  };
}

export const api = real || createMock();

// Clipboard is read in the renderer (async) — synchronous reads in the main
// process can stall the whole app on some Linux desktops.
export async function readClipboard() {
  try { return (await navigator.clipboard.readText()) || ''; } catch { return ''; }
}
