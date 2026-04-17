export default {
  // TitleBar
  appVersion: 'v1.0',
  activeDownloads: (n) => `${n} aktywne`,

  // TabBar
  tabDownload: 'Pobieranie',
  tabHistory: 'Historia',
  downloading: 'Pobieranie aktywne',

  // DownloadPage
  urlLabel: 'Link do filmu',
  urlPlaceholder: 'https://youtube.com/watch?v=...',
  pasteBtn: '⌘ Wklej',
  qualityLabel: 'Jakość wideo',
  optionsLabel: 'Opcje',
  audioOnlyLabel: 'Tylko audio',
  audioOnlySub: 'Eksport MP3',
  subtitlesLabel: 'Napisy',
  subtitlesSub: 'Auto-embed SRT',
  thumbnailLabel: 'Miniatura',
  thumbnailSub: 'Pobierz JPG',
  activeLabel: 'Aktywne pobierania',
  activeHint: '— kliknij ■ aby zatrzymać',
  folderLabel: 'Folder docelowy',
  folderHint: 'Kliknij ścieżkę aby otworzyć · Ustawienie zapisywane automatycznie',
  folderChanging: 'Wybieranie...',
  folderChange: '✎ Zmień',
  downloadBtn: 'POBIERZ TERAZ',
  downloadMp3Btn: 'POBIERZ MP3',
  preparingBtn: 'PRZYGOTOWANIE...',
  sitesLabel: 'Obsługiwane serwisy',
  ffmpegWarning: (q) => `${q} wymaga ffmpeg (pobierany automatycznie przy pierwszym użyciu).`,
  extensionHint: 'Zainstaluj rozszerzenie Chrome / Edge i pobieraj filmy jednym kliknięciem bezpośrednio ze strony!',

  // HistoryPage
  historyCount: (n) => `${n} wpisów`,
  clearHistory: 'Wyczyść historię',
  historyEmpty: 'Brak historii pobierań',
  historyEmptySub: 'Twoje pobrane filmy pojawią się tutaj',
  badgeOk: 'OK',
  badgeError: 'Błąd',
  badgeDownloading: 'Pobieranie...',
  openFolder: 'Otwórz folder',
  retry: 'Ponów',

  // StatusBar
  serverLabel: 'TouchMyVideo · port 43210',
  downloaded: 'Pobrane',
  logs: 'Logi',
  repairTools: '⟳ Napraw narzędzia',

  // SetupScreen
  setupTitle: 'Konfiguracja przy pierwszym uruchomieniu',
  setupDesc: 'TouchMyVideo pobiera wymagane komponenty automatycznie. To jednorazowe działanie — nie musisz nic instalować ręcznie.',
  setupDone: 'Wszystko gotowe!',
  setupError: 'Błąd pobierania',
  setupErrorHint: 'Sprawdź połączenie z internetem i uruchom aplikację ponownie.',
  setupDownloading: '↓ pobieranie',
  setupOk: '✓ ok',
  setupStoredAt: 'Pliki zapisywane do: %AppData%\\TouchMyVideo\\tools\\',

  // Toasts
  toastStarted: '⬇️ Pobieranie rozpoczęte',
  toastDone: '✅ Pobrano pomyślnie!',
  toastCancelled: '⏹ Pobieranie zatrzymane',
  toastHistoryCleared: 'Historia wyczyszczona',
  toastReinstalling: '⟳ Reinstalacja narzędzi...',
  toastReady: '✅ Aplikacja gotowa!',

  // Language switcher
  language: 'Język',
};
