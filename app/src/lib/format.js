export function bytes(n, lang = 'en') {
  if (!n || n < 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  const digits = n >= 100 || i === 0 ? 0 : 1;
  return n.toLocaleString(lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }) + ' ' + units[i];
}

export function speed(n, lang) {
  const b = bytes(n, lang);
  return b ? b + '/s' : null;
}

export function duration(sec) {
  if (!sec && sec !== 0) return null;
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function eta(sec) {
  if (sec === null || sec === undefined || sec < 0) return null;
  if (sec < 60) return `${Math.max(1, Math.round(sec))} s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  return `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min`;
}

export function when(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (diff < 60) return rtf.format(0, 'second');
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  if (diff < 7 * 86400) return rtf.format(-Math.round(diff / 86400), 'day');
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function host(url) {
  try { return new URL(url).hostname.replace(/^www\.|^m\./, ''); } catch { return ''; }
}

export const isUrl = (s) => /^https?:\/\/\S+$/i.test((s || '').trim());

export const qualityLabel = (q) => (q === 'best' ? null : q === '2160' ? '4K' : q === '1440' ? '1440p' : `${q}p`);
