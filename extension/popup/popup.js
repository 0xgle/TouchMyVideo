import { findApp, sendToApp, launchUrl, isWebUrl } from '../lib.js';

const msg = (k) => chrome.i18n.getMessage(k);
const $ = (id) => document.getElementById(id);
document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = msg(el.dataset.i18n); });

let tab = null;
let mode = 'video';

const settings = await chrome.storage.local.get(['mode', 'quality']);
if (settings.mode) setMode(settings.mode);
if (settings.quality !== undefined) $('quality').value = settings.quality;

function setMode(m) {
  mode = m;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  $('qualityRow').setAttribute('aria-disabled', String(m === 'audio'));
}
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { setMode(b.dataset.mode); chrome.storage.local.set({ mode }); }));
$('quality').addEventListener('change', () => chrome.storage.local.set({ quality: $('quality').value }));

function result(text, kind) { const r = $('result'); r.textContent = text; r.className = 'result ' + (kind || ''); }

[tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const pageUrl = tab?.url;
if (isWebUrl(pageUrl)) {
  $('title').textContent = tab.title || pageUrl;
  try { $('host').textContent = new URL(pageUrl).hostname.replace(/^www\./, ''); } catch {}
} else {
  $('title').textContent = msg('notAPage');
}

const app = await findApp();
$('status').dataset.state = app ? 'on' : 'off';
$('status').textContent = app ? msg('connected') : msg('disconnected');
$('ready').hidden = !app;
$('offline').hidden = !!app;
$('go').disabled = !isWebUrl(pageUrl);

$('go').addEventListener('click', async () => {
  $('go').disabled = true;
  const r = await sendToApp({ url: pageUrl, title: tab?.title, quality: mode === 'audio' ? null : ($('quality').value || 'best'), audioOnly: mode === 'audio' });
  if (r.ok) { result(msg('sent'), 'ok'); setTimeout(() => window.close(), 1200); }
  else { result(msg('failed'), 'err'); $('go').disabled = false; }
});

$('launch').addEventListener('click', () => {
  if (tab?.id) chrome.tabs.update(tab.id, { url: launchUrl(isWebUrl(pageUrl) ? pageUrl : '') });
  window.close();
});
