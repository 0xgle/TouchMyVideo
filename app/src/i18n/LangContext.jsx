import { createContext, useContext, useState, useCallback } from 'react';
import { getSavedLang, saveLang, t as translate, LANG_NAMES } from './index.js';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getSavedLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    saveLang(l);
  }, []);

  const t = useCallback((key, ...args) => translate(lang, key, ...args), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t, LANG_NAMES }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
