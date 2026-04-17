const APP_URL = 'http://127.0.0.1:43210';

let currentUrl = '';
let appConnected = false;
let selectedQuality = 'best';
let audioOnly = false;

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const urlText = document.getElementById('urlText');
const btnDownload = document.getElementById('btnDownload');
const result = document.getElementById('result');
const warning = document.getElementById('warning');
const audioToggle = document.getElementById('audioToggle');
const qualityRow = document.getElementById('qualityRow');

// Check app connection
async function checkConnection() {
  try {
    const res = await fetch(`${APP_URL}/ping`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    if (data.status === 'ok') {
      appConnected = true;
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Aplikacja połączona';
      warning.classList.remove('show');
      if (currentUrl) btnDownload.disabled = false;
    }
  } catch {
    appConnected = false;
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Aplikacja niedostępna';
    warning.classList.add('show');
    btnDownload.disabled = true;
  }
}

// Get current tab URL
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    currentUrl = tab.url;
    const short = currentUrl.length > 42 ? currentUrl.substring(0, 42) + '...' : currentUrl;
    urlText.textContent = short;
    urlText.title = currentUrl;
    if (appConnected) btnDownload.disabled = false;
  }
}

// Quality buttons
document.querySelectorAll('.quality-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedQuality = btn.dataset.q;
  });
});

// Audio toggle
audioToggle.addEventListener('click', () => {
  audioOnly = !audioOnly;
  audioToggle.classList.toggle('on', audioOnly);
  qualityRow.style.opacity = audioOnly ? '0.3' : '1';
  qualityRow.style.pointerEvents = audioOnly ? 'none' : 'auto';
  btnDownload.textContent = audioOnly ? '↓ Pobierz MP3' : '↓ Pobierz film';
});

// Download
btnDownload.addEventListener('click', async () => {
  if (!currentUrl || !appConnected) return;

  btnDownload.disabled = true;
  btnDownload.textContent = '⟳ Wysyłanie...';
  result.className = 'result';

  try {
    const res = await fetch(`${APP_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl, quality: selectedQuality, audioOnly }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      result.textContent = '✅ Pobieranie rozpoczęte w aplikacji!';
      result.className = 'result success show';
      btnDownload.textContent = audioOnly ? '↓ Pobierz MP3' : '↓ Pobierz film';
      btnDownload.disabled = false;
    } else {
      throw new Error('Server error');
    }
  } catch (err) {
    result.textContent = '❌ Błąd połączenia z aplikacją.';
    result.className = 'result error show';
    btnDownload.textContent = audioOnly ? '↓ Pobierz MP3' : '↓ Pobierz film';
    btnDownload.disabled = false;
  }

  setTimeout(() => { result.className = 'result'; }, 4000);
});

// Init
(async () => {
  await checkConnection();
  await getCurrentTab();
})();
