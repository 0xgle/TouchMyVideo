import { useState } from 'react';

const QUALITIES = [
  { id: 'best', label: 'Najlepsza', sub: 'Auto' },
  { id: '4K', label: '4K', sub: '2160p' },
  { id: '1080p', label: 'FHD', sub: '1080p' },
  { id: '720p', label: 'HD', sub: '720p' },
  { id: '480p', label: 'SD', sub: '480p' },
];

const SUPPORTED_SITES = [
  { name: 'YouTube', color: '#ff0000', icon: '▶' },
  { name: 'Vimeo', color: '#19b7ea', icon: '◈' },
  { name: 'Twitter/X', color: '#1da1f2', icon: '✦' },
  { name: 'Facebook', color: '#1877f2', icon: '◉' },
  { name: 'Instagram', color: '#e1306c', icon: '◎' },
  { name: 'TikTok', color: '#fe2c55', icon: '◆' },
];

export default function DownloadPanel({ onDownload, activeDownloads }) {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [audioOnly, setAudioOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    await onDownload({ url: url.trim(), quality, audioOnly });
    setTimeout(() => {
      setIsLoading(false);
      setUrl('');
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const activeList = Object.entries(activeDownloads);

  return (
    <div className="h-full overflow-y-auto px-6 py-6 flex flex-col gap-6">
      
      {/* URL Input */}
      <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '0ms' }}>
        <label className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Link do filmu
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--text-muted)' }}>
            🔗
          </div>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://youtube.com/watch?v=..."
            className="no-drag w-full pl-11 pr-4 py-4 rounded-xl text-sm font-mono outline-none transition-all duration-200 input-glow"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Quality selector */}
      {!audioOnly && (
        <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '60ms' }}>
          <label className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Jakość wideo
          </label>
          <div className="flex gap-2">
            {QUALITIES.map(q => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className="no-drag flex-1 py-3 rounded-xl text-center transition-all duration-200 relative overflow-hidden"
                style={{
                  background: quality === q.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                  border: `1px solid ${quality === q.id ? 'var(--accent)' : 'var(--border)'}`,
                  color: quality === q.id ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <div className="text-xs font-display font-bold">{q.label}</div>
                <div className="text-xs opacity-60 font-mono">{q.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio only toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl animate-slide-up"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animationDelay: '120ms' }}>
        <div>
          <div className="text-sm font-display font-semibold">Tylko audio (MP3)</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Pobierz wyłącznie ścieżkę dźwiękową
          </div>
        </div>
        <button
          onClick={() => setAudioOnly(v => !v)}
          className="no-drag w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0"
          style={{ background: audioOnly ? 'var(--accent)' : 'var(--bg-hover)', border: '1px solid var(--border)' }}
        >
          <div className="absolute top-0.5 transition-all duration-300 w-5 h-5 rounded-full bg-white shadow-md"
            style={{ left: audioOnly ? '26px' : '2px' }} />
        </button>
      </div>

      {/* Download button */}
      <button
        onClick={handleSubmit}
        disabled={!url.trim() || isLoading}
        className="no-drag w-full py-4 rounded-xl font-display font-bold text-base tracking-wide transition-all duration-200 animate-slide-up relative overflow-hidden"
        style={{
          background: url.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-card)',
          color: url.trim() && !isLoading ? 'white' : 'var(--text-muted)',
          border: `1px solid ${url.trim() && !isLoading ? 'var(--accent)' : 'var(--border)'}`,
          animationDelay: '180ms',
          boxShadow: url.trim() && !isLoading ? '0 0 30px var(--accent-glow)' : 'none',
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin-slow">◌</span> Uruchamianie...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            ↓ {audioOnly ? 'Pobierz MP3' : 'Pobierz wideo'}
          </span>
        )}
      </button>

      {/* Active downloads */}
      {activeList.length > 0 && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <label className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Aktywne pobierania
          </label>
          {activeList.map(([id, dl]) => (
            <div key={id} className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-body truncate pr-4" style={{ color: 'var(--text-primary)' }}>
                  {dl.title || 'Pobieranie...'}
                </span>
                <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--accent)' }}>
                  {Math.round(dl.progress)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div
                  className="h-full rounded-full progress-shimmer transition-all duration-300"
                  style={{ width: `${dl.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supported sites */}
      <div className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '240ms' }}>
        <label className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Obsługiwane serwisy
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_SITES.map(site => (
            <div key={site.name} className="flex items-center gap-2 p-3 rounded-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span style={{ color: site.color, fontSize: '14px' }}>{site.icon}</span>
              <span className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>{site.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs font-mono text-center" style={{ color: 'var(--text-muted)' }}>
          + 1000 innych serwisów via yt-dlp
        </p>
      </div>

      {/* Extension hint */}
      <div className="p-4 rounded-xl flex items-start gap-3 animate-slide-up"
        style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', animationDelay: '300ms' }}>
        <span className="text-lg flex-shrink-0">🧩</span>
        <div>
          <div className="text-sm font-display font-semibold" style={{ color: 'var(--accent)' }}>
            Rozszerzenie Chrome / Edge
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Zainstaluj rozszerzenie i pobieraj filmy jednym kliknięciem bezpośrednio ze strony!
            Upewnij się że aplikacja jest uruchomiona.
          </div>
        </div>
      </div>
    </div>
  );
}
