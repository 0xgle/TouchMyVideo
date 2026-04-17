const isElectron = typeof window !== 'undefined' && window.electronAPI;

function StatusBadge({ status }) {
  const config = {
    completed: { label: 'OK', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    downloading: { label: 'Pobieranie', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    error: { label: 'Błąd', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  };
  const c = config[status] || config.error;
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}33` }}>
      {c.label}
    </span>
  );
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function HistoryPanel({ history, activeDownloads, onClear }) {
  const isEmpty = history.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {history.length} wpisów
        </span>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="no-drag text-xs font-mono px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Wyczyść historię
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
            <div className="text-4xl">◷</div>
            <div className="text-sm font-display font-semibold" style={{ color: 'var(--text-muted)' }}>
              Brak historii pobierań
            </div>
            <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Twoje pobrane filmy pojawią się tutaj
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item, i) => {
              const isActive = !!activeDownloads[item.id];
              const progress = isActive ? activeDownloads[item.id]?.progress : item.progress;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl card-hover animate-slide-up"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    animationDelay: `${i * 30}ms`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-body font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.title || item.url}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {formatTime(item.timestamp)}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          {item.quality}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={isActive ? 'downloading' : item.status} />
                      {item.status === 'completed' && isElectron && (
                        <button
                          onClick={() => window.electronAPI.openDownloads()}
                          className="no-drag text-xs font-mono p-1.5 rounded-lg transition-all hover:opacity-70"
                          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                          title="Otwórz folder"
                        >
                          📁
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress for active */}
                  {isActive && (
                    <div className="mt-2">
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <div
                          className="h-full rounded-full progress-shimmer transition-all duration-300"
                          style={{ width: `${progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* URL */}
                  <div className="mt-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="no-drag text-xs font-mono truncate block hover:underline"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {item.url}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
