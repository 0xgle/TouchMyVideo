import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { api, readClipboard } from './lib/api.js';
import pl from './i18n/pl.js';
import en from './i18n/en.js';

const DICTS = { pl, en };
const Ctx = createContext(null);

function jobsReducer(state, action) {
  switch (action.type) {
    case 'list': return action.list;
    case 'update': {
      const i = state.findIndex(j => j.id === action.job.id);
      if (i === -1) return [action.job, ...state];
      const next = state.slice();
      next[i] = action.job;
      return next;
    }
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [jobs, dispatch] = useReducer(jobsReducer, []);
  const [settings, setSettingsState] = useState(null);
  const [tools, setTools] = useState(null);
  const [info, setInfo] = useState({});
  const [toasts, setToasts] = useState([]);
  const [view, setView] = useState('download');
  const [incomingUrl, setIncomingUrl] = useState(null);   // from clipboard / extension
  const toastSeq = useRef(0);

  const lang = settings?.language || ((navigator.language || 'en').toLowerCase().startsWith('pl') ? 'pl' : 'en');
  const dict = DICTS[lang] || en;
  // Always reads the current language — no stale closures in event handlers.
  const t = useCallback((key, ...args) => {
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), dict)
      ?? key.split('.').reduce((o, k) => (o == null ? o : o[k]), en) ?? key;
    return typeof val === 'function' ? val(...args) : val;
  }, [dict]);
  const tRef = useRef(t);
  tRef.current = t;

  const toast = useCallback((msg, kind = 'info') => {
    const id = ++toastSeq.current;
    setToasts(ts => [...ts.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3600);
  }, []);

  useEffect(() => {
    api.getSettings().then(setSettingsState);
    api.toolsStatus().then(setTools);
    api.listJobs().then(list => dispatch({ type: 'list', list }));
    api.appInfo().then(setInfo);
    const offs = [
      api.onJobUpdate(job => dispatch({ type: 'update', job })),
      api.onJobList(list => dispatch({ type: 'list', list })),
      api.onToolsStatus(setTools),
      api.onExternalUrl(({ url }) => { setView('download'); setIncomingUrl({ url, source: 'external', at: Date.now() }); }),
      api.onExternalAdded(() => toast(tRef.current('toastExternal'), 'info')),
    ];
    return () => offs.forEach(off => off && off());
  }, [toast]);

  // Offer a fresh link from the clipboard whenever the window regains focus.
  const lastClip = useRef(null);
  const watch = settings?.watchClipboard;
  useEffect(() => {
    if (!watch) return;
    const check = async () => {
      const text = (await readClipboard()).trim();
      if (lastClip.current === null) { lastClip.current = text; if (!/^https?:\/\/\S+$/i.test(text)) return; }
      else if (text === lastClip.current) return;
      lastClip.current = text;
      if (/^https?:\/\/\S+$/i.test(text) && text.length < 2000) setIncomingUrl({ url: text, source: 'clipboard', at: Date.now() });
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [watch]);

  const updateSettings = useCallback(async (patch) => {
    setSettingsState(s => ({ ...s, ...patch }));          // optimistic
    const s = await api.setSettings(patch);
    setSettingsState(s);
    return s;
  }, []);

  const value = useMemo(() => ({
    jobs, settings, tools, info, toasts, view, lang, t, incomingUrl,
    setView, toast, updateSettings, setSettingsState, setIncomingUrl,
  }), [jobs, settings, tools, info, toasts, view, lang, t, incomingUrl, toast, updateSettings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);

export const ACTIVE = ['queued', 'downloading', 'processing'];
