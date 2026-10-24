'use strict';
// Strings used by the main process (tray, notifications, dialogs).
const { language } = require('./store');

const S = {
  pl: {
    open: 'Otwórz TouchMyVideo',
    openFolder: 'Otwórz folder pobranych',
    pauseAll: 'Zatrzymaj wszystkie pobierania',
    quit: 'Zakończ',
    active: (n) => `Pobieranie: ${n}`,
    trayHint: 'TouchMyVideo działa dalej w zasobniku. Kliknij ikonę, aby wrócić.',
    doneTitle: 'Pobrano',
    failTitle: 'Nie udało się pobrać',
    pickFolder: 'Wybierz folder na pobrane pliki',
    quitConfirm: 'Trwa pobieranie. Zakończyć i przerwać pobieranie?',
    quitYes: 'Zakończ', quitNo: 'Anuluj',
  },
  en: {
    open: 'Open TouchMyVideo',
    openFolder: 'Open downloads folder',
    pauseAll: 'Stop all downloads',
    quit: 'Quit',
    active: (n) => `Downloading: ${n}`,
    trayHint: 'TouchMyVideo keeps running in the tray. Click the icon to come back.',
    doneTitle: 'Downloaded',
    failTitle: 'Download failed',
    pickFolder: 'Choose a folder for downloads',
    quitConfirm: 'Downloads are in progress. Quit and stop them?',
    quitYes: 'Quit', quitNo: 'Cancel',
  },
};

function t(key, ...args) {
  const v = (S[language()] || S.en)[key] ?? S.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

module.exports = { t };
