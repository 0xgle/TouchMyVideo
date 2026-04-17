import { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar';
import TabBar from './components/TabBar';
import DownloadPage from './components/DownloadPage';
import HistoryPage from './components/HistoryPage';
import StatusBar from './components/StatusBar';
import Toast from './components/Toast';
import SetupScreen from './components/SetupScreen';
import { useLang } from './i18n/LangContext.jsx';

const isTMV = typeof window !== 'undefined' && !!window.tmv;

export default function App() {
  const [tab, setTab]       = useState('download');
  const [history, setHistory] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  const { t } = useLang();
  const [toasts, setToasts] = useState([]);
  const [setup, setSetup]   = useState(null); // null | { tools, pct, label, done, error }
  const toastId = useRef(0);

  const toast = useCallback((msg, type = 'success') => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  useEffect(() => {
    if (!isTMV) return;

    window.tmv.getHistory().then(setHistory);

    // Setup / first-run events
    const offs = [
      window.tmv.onSetupStart((d) => setSetup({ tools: d.tools, pct: 0, label: 'Przygotowanie...', done: false, error: null })),
      window.tmv.onSetupProgress((d) => setSetup(s => s ? { ...s, pct: d.pct, label: d.label } : s)),
      window.tmv.onSetupDone(() => {
        setSetup(s => ({ ...s, pct: 100, label: 'Gotowe!', done: true }));
        setTimeout(() => setSetup(null), 1800);
        toast(t('toastReady'), 'success');
      }),
      window.tmv.onSetupError((d) => setSetup(s => ({ ...s, error: d.message }))),

      // Download events
      window.tmv.onDownloadStarted((d) => {
        setActiveDownloads(p => ({ ...p, [d.id]: { progress: 0, title: d.title, speed: '', eta: '', size: '' } }));
        toast(t('toastStarted'), 'info');
      }),
      window.tmv.onDownloadProgress((d) => {
        setActiveDownloads(p => ({ ...p, [d.id]: { progress: d.progress, title: d.title, speed: d.speed, eta: d.eta, size: d.size } }));
      }),
      window.tmv.onDownloadComplete((d) => {
        setActiveDownloads(p => { const n = { ...p }; delete n[d.id]; return n; });
        if (d.success) toast(t('toastDone'), 'success');
        else toast(d.error || '❌ Błąd pobierania', 'error');
      }),
      window.tmv.onHistoryUpdate(setHistory),
    ];

    return () => offs.forEach(off => off && off());
  }, []);

  const handleReinstall = useCallback(async () => {
    if (isTMV) {
      toast(t('toastReinstalling'), 'info');
      await window.tmv.reinstallTools();
    }
  }, []);

  const handleCancel = useCallback((id) => {
    if (isTMV) window.tmv.cancelDownload(id);
    setActiveDownloads(p => { const n = {...p}; delete n[id]; return n; });
    toast(t('toastCancelled'), 'info');
  }, []);

  const handleDownload = useCallback(async (params) => {
    if (isTMV) {
      await window.tmv.startDownload(params);
    } else {
      // Dev simulation
      const id = 'dl_' + Date.now();
      setActiveDownloads(p => ({ ...p, [id]: { progress: 0, title: 'Demo film.mp4', speed: '0 MB/s', eta: '?', size: '0/167 MB' } }));
      toast(t('toastStarted') + ' (demo)', 'info');
      let pct = 0;
      const speeds = ['4.2 MB/s','8.7 MB/s','11.2 MB/s','9.1 MB/s'];
      let si = 0;
      const iv = setInterval(() => {
        pct += Math.random() * 9 + 3;
        if (pct >= 100) {
          clearInterval(iv);
          setActiveDownloads(p => { const n = {...p}; delete n[id]; return n; });
          toast(t('toastDone') + ' (demo)', 'success');
          return;
        }
        si = (si + 1) % speeds.length;
        setActiveDownloads(p => ({ ...p, [id]: {
          progress: Math.round(pct), title: 'Demo film.mp4',
          speed: speeds[si], eta: Math.round((100-pct)/8)+'s',
          size: Math.round(pct*1.67)+'/167 MB',
        }}));
      }, 350);
    }
  }, []);

  const activeCount = Object.keys(activeDownloads).length;

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100vh',
      background:'var(--bg)', position:'relative', overflow:'hidden', borderRadius:12,
    }}>
      {/* Background effects */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        background:'radial-gradient(ellipse 60% 40% at 10% 0%, rgba(0,255,136,0.04) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 90% 100%, rgba(59,130,246,0.03) 0%, transparent 60%)' }} />
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
        backgroundSize:'40px 40px' }} />

      {/* Setup overlay — first run */}
      {setup && <SetupScreen setup={setup} />}

      {/* Main UI */}
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', height:'100%' }}>
        <TitleBar activeCount={activeCount} />
        <TabBar tab={tab} setTab={setTab} historyCount={history.length} activeCount={activeCount} />
        <div style={{ flex:1, overflow:'hidden' }}>
          {tab === 'download' && <DownloadPage onDownload={handleDownload} activeDownloads={activeDownloads} onCancel={handleCancel} />}
          {tab === 'history'  && <HistoryPage  history={history} activeDownloads={activeDownloads} onClear={async () => { if(isTMV) await window.tmv.clearHistory(); setHistory([]); toast(t('toastHistoryCleared'),'info'); }} />}
        </div>
        <StatusBar activeCount={activeCount} onReinstall={handleReinstall} />
      </div>

      {/* Toasts */}
      <div style={{ position:'fixed', bottom:40, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:200 }}>
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} />)}
      </div>
    </div>
  );
}
