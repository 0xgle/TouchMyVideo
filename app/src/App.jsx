import { Download, Library, Settings } from 'lucide-react';
import { useApp, ACTIVE } from './state.jsx';
import { Toasts, Bar } from './components/common.jsx';
import DownloadView from './components/DownloadView.jsx';
import LibraryView from './components/LibraryView.jsx';
import SettingsView from './components/SettingsView.jsx';

export default function App() {
  const { t, view, setView, jobs, toasts, info } = useApp();
  const running = jobs.filter(j => j.status === 'downloading' || j.status === 'processing');
  const activeCount = jobs.filter(j => ACTIVE.includes(j.status)).length;
  const overall = running.length ? running.reduce((a, j) => a + (j.progress || 0), 0) / running.length : 0;

  const nav = [
    { id: 'download', label: t('navDownload'), icon: Download, count: activeCount || null },
    { id: 'library', label: t('navLibrary'), icon: Library },
  ];

  return (
    <div className="shell">
      <header className={'titlebar' + (info?.platform === 'darwin' ? ' mac' : '')}>
        <div className="wordmark"><span className="mark" aria-hidden="true" />TouchMyVideo</div>
      </header>

      <nav className="side" aria-label="TouchMyVideo">
        {nav.map(n => (
          <button key={n.id} className="nav-item" aria-current={view === n.id ? 'page' : undefined} onClick={() => setView(n.id)} title={n.label}>
            <n.icon size={18} /><span>{n.label}</span>
            {n.count ? <span className="count num">{n.count}</span> : null}
          </button>
        ))}
        <div className="spacer" />
        {running.length > 0 && (
          <div className="side-meter">
            <strong className="num">{t('navActive', activeCount)}</strong>
            <Bar value={overall} />
          </div>
        )}
        <button className="nav-item" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => setView('settings')} title={t('navSettings')}>
          <Settings size={18} /><span>{t('navSettings')}</span>
        </button>
      </nav>

      <main className="main">
        {view === 'download' && <DownloadView />}
        {view === 'library' && <LibraryView />}
        {view === 'settings' && <SettingsView />}
      </main>

      <Toasts toasts={toasts} />
    </div>
  );
}
