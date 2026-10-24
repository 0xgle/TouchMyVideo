// Shared by the popup and the background worker.
export const PORTS = [43210, 43211, 43212, 43213, 43214];

async function ping(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/ping`, { signal: AbortSignal.timeout(800) });
    const d = await r.json();
    return d.app === 'TouchMyVideo' ? d : null;
  } catch { return null; }
}

/** Find the running app. Remembers the last port that answered. */
export async function findApp() {
  const { lastPort } = await chrome.storage.local.get('lastPort');
  const order = lastPort ? [lastPort, ...PORTS.filter(p => p !== lastPort)] : PORTS;
  for (const port of order) {
    const info = await ping(port);
    if (info) { if (port !== lastPort) chrome.storage.local.set({ lastPort: port }); return { port, ...info }; }
  }
  return null;
}

export async function sendToApp({ url, title, quality = null, audioOnly = false }) {
  const app = await findApp();
  if (!app) return { ok: false, error: 'offline' };
  try {
    const r = await fetch(`http://127.0.0.1:${app.port}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, quality, audioOnly }),
      signal: AbortSignal.timeout(5000),
    });
    return await r.json();
  } catch {
    // The app answered /ping, so it is running — don't relaunch it (that could add a duplicate).
    return { ok: false, error: 'timeout' };
  }
}

/** Ask the OS to start the app via its touchmyvideo:// link (the browser shows a confirmation). */
export function launchUrl(url) {
  return 'touchmyvideo://download' + (url ? '?url=' + encodeURIComponent(url) : '');
}

export const isWebUrl = (u) => /^https?:\/\//i.test(u || '');
