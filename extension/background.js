import { sendToApp, launchUrl, isWebUrl } from './lib.js';

const msg = (k) => chrome.i18n.getMessage(k);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'tmv-page', title: msg('menuVideo'), contexts: ['page', 'video', 'audio'] });
    chrome.contextMenus.create({ id: 'tmv-link', title: msg('menuLink'), contexts: ['link'] });
    chrome.contextMenus.create({ id: 'tmv-audio', title: msg('menuAudio'), contexts: ['page', 'link', 'video', 'audio'] });
  });
});

function flash(tabId, ok) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: ok ? '#19e08a' : '#ff6b5e' });
  chrome.action.setBadgeText({ tabId, text: ok ? '✓' : '!' });
  setTimeout(() => chrome.action.setBadgeText({ tabId, text: '' }), 2500);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // <video> sources are usually blob: URLs that only work inside the page — use the page instead.
  const media = isWebUrl(info.srcUrl) ? info.srcUrl : null;
  const page = isWebUrl(info.pageUrl) ? info.pageUrl : tab?.url;
  const url = info.menuItemId === 'tmv-link' ? info.linkUrl
    : info.menuItemId === 'tmv-audio' ? (info.linkUrl || page)
    : (media || page);
  if (!isWebUrl(url)) return flash(tab?.id, false);

  const r = await sendToApp({ url, title: info.linkUrl ? null : tab?.title, audioOnly: info.menuItemId === 'tmv-audio' });
  if (r.ok) return flash(tab?.id, true);
  flash(tab?.id, false);
  // App not running: hand the link over through the touchmyvideo:// protocol, which starts it.
  if (r.error === 'offline' && tab?.id) chrome.tabs.update(tab.id, { url: launchUrl(url) });
});
