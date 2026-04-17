import en from './en.js';
import pl from './pl.js';

export const languages = { en, pl };

export const LANG_NAMES = {
  en: { label: 'English', flag: '🇬🇧' },
  pl: { label: 'Polski',  flag: '🇵🇱' },
};

const STORAGE_KEY = 'tmv_language';

export function getSavedLang() {
  try { return localStorage.getItem(STORAGE_KEY) || 'en'; }
  catch { return 'en'; }
}

export function saveLang(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
}

export function t(lang, key, ...args) {
  const dict = languages[lang] || languages.en;
  const val = dict[key] ?? languages.en[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}
