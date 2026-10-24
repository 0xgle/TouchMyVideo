import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, ClipboardPaste, X, Clock, User, ListVideo, Film, Music, Download, CircleAlert, Globe } from 'lucide-react';
import { useApp, ACTIVE } from '../state.jsx';
import { api, readClipboard } from '../lib/api.js';
import { isUrl, duration, bytes, host, qualityLabel } from '../lib/format.js';
import { Thumb, CheckChip, Segmented } from './common.jsx';
import JobRow from './JobRow.jsx';
import ToolsStatus from './ToolsStatus.jsx';

const looksLikePlaylist = (u) => /[?&]list=|\/playlist|\/sets\/|\/album\//i.test(u);
const isPurePlaylist = (u) => /youtube\.com\/playlist\?|\/sets\/|\/album\//i.test(u);

export default function DownloadView() {
  const { t, lang, settings, jobs, toast, incomingUrl, setIncomingUrl, setView, tools, setSettingsState } = useApp();
  const [url, setUrl] = useState('');
  const [probe, setProbe] = useState({ state: 'idle' });
  const [mode, setMode] = useState('video');
  const [quality, setQuality] = useState(null);
  const [subtitles, setSubtitles] = useState(false);
  const [thumbnail, setThumbnail] = useState(false);
  const [playlist, setPlaylist] = useState(false);
  const [offer, setOffer] = useState(null);
  const inputRef = useRef(null);
  const reqId = useRef(0);

  // ── Incoming links: extension / protocol fill the field, clipboard is only offered ──
  useEffect(() => {
    if (!incomingUrl) return;
    if (incomingUrl.source === 'external') { applyUrl(incomingUrl.url); setOffer(null); }
    else if (incomingUrl.url !== url.trim()) setOffer(incomingUrl.url);
    setIncomingUrl(null);
  }, [incomingUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+V anywhere pastes into the link field.
  useEffect(() => {
    const onPaste = (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const text = e.clipboardData?.getData('text')?.trim();
      if (text) { e.preventDefault(); applyUrl(text); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  function applyUrl(u) {
    setUrl(u);
    setPlaylist(isPurePlaylist(u));
    inputRef.current?.focus();
  }

  // ── Probe the link (debounced) ────────────────────────────────────────────
  useEffect(() => {
    const u = url.trim();
    if (!u) { setProbe({ state: 'idle' }); return; }
    if (!isUrl(u)) { setProbe({ state: 'idle' }); return; }
    if (tools && !tools.ytdlp) { setProbe({ state: 'idle' }); return; }
    const id = ++reqId.current;
    setProbe({ state: 'loading' });
    const timer = setTimeout(async () => {
      const r = await api.probe(u, { playlist });
      if (id !== reqId.current) return;
      if (r.ok) setProbe({ state: 'ok', info: r.info });
      else if (r.error !== 'cancelled') setProbe({ state: 'error', error: r.error, message: r.message });
    }, 450);
    return () => clearTimeout(timer);
  }, [url, playlist, tools?.ytdlp]);

  // Pick the default quality: the user's preference, or the best one below it.
  const info = probe.info;
  const buckets = info?.buckets?.length ? info.buckets : [2160, 1440, 1080, 720, 480, 360];
  useEffect(() => {
    if (!settings) return;
    if (settings.quality === 'best') { setQuality('best'); return; }
    const pref = Number(settings.quality);
    const fit = buckets.find(b => b <= pref) || buckets[buckets.length - 1];
    setQuality(info?.buckets?.length ? String(fit) : settings.quality);
  }, [info, settings?.quality]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (settings) setSubtitles(settings.subtitles); }, [settings?.subtitles]); // eslint-disable-line

  const sizeFor = (b) => {
    if (!info?.heights) return null;
    const h = info.heights.find(x => x.height >= b * 0.9 && x.height <= b * 1.1) || null;
    return h?.size ? bytes(h.size, lang) : null;
  };

  const download = async (force = false) => {
    const u = url.trim();
    if (!isUrl(u)) return;
    const options = {
      quality: mode === 'audio' ? 'best' : (quality || 'best'),
      audioOnly: mode === 'audio', subtitles, thumbnail,
      playlist: playlist || info?.kind === 'playlist',
    };
    const r = await api.addJob({ url: u, options, preview: force ? null : info });
    if (r.ok) {
      toast(t('toastQueued'), 'success');
      setUrl(''); setProbe({ state: 'idle' }); setOffer(null);
    } else {
      toast(t(`errors.${r.error}`), 'error');
    }
  };

  const active = useMemo(() => jobs.filter(j => ACTIVE.includes(j.status)), [jobs]);
  const recent = useMemo(() => jobs.filter(j => !ACTIVE.includes(j.status)).slice(0, 4), [jobs]);
  const showPlaylistToggle = looksLikePlaylist(url) && !isPurePlaylist(url);

  const buttonLabel = info?.kind === 'playlist'
    ? t('downloadPlaylist', info.count)
    : mode === 'audio' ? t('downloadAudio', settings?.audioFormat || 'mp3') : t('downloadVideo', qualityLabel(quality));

  return (
    <div className="page">
      <ToolsStatus />

      <div>
        <label className="urlbar">
          <span className="sr">{t('urlPlaceholder')}</span>
          <Link className="lead" size={19} />
          <input
            ref={inputRef} value={url} autoFocus spellCheck={false}
            placeholder={t('urlPlaceholder')}
            onChange={e => { setUrl(e.target.value); setPlaylist(isPurePlaylist(e.target.value)); }}
            onKeyDown={e => { if (e.key === 'Enter' && probe.state === 'ok') download(); if (e.key === 'Escape') setUrl(''); }}
          />
          {url
            ? <button className="btn ghost" onClick={() => { setUrl(''); inputRef.current?.focus(); }}><X size={16} />{t('clear')}</button>
            : <button className="btn ghost" onClick={async () => { const c = (await readClipboard()).trim(); if (c) applyUrl(c); }}><ClipboardPaste size={16} />{t('paste')}</button>}
        </label>
        {offer && !url && (
          <div className="clip-offer">
            <ClipboardPaste size={16} />
            <span>{t('clipboardOffer')}</span>
            <span className="u">{offer}</span>
            <button className="btn primary" onClick={() => { applyUrl(offer); setOffer(null); }}>{t('clipboardUse')}</button>
            <button className="icon-btn" aria-label={t('clear')} onClick={() => setOffer(null)}><X size={16} /></button>
          </div>
        )}
      </div>

      {probe.state === 'idle' && !url && active.length === 0 && (
        <div className="empty">
          <h2>{t('emptyTitle')}</h2>
          <p>{t('emptyBody')}</p>
          <span className="hint">{t('emptyShortcut')}</span>
        </div>
      )}

      {probe.state === 'loading' && (
        <div className="preview" aria-busy="true">
          <div className="frame skeleton" />
          <div className="preview-body"><span style={{ color: 'var(--dim)' }}>{t('probing')}</span></div>
        </div>
      )}

      {probe.state === 'error' && (
        <div className="notice" role="alert">
          <CircleAlert size={18} />
          <h3>{t('probeErrorTitle')}</h3>
          <p>{t(`errors.${probe.error}`)}</p>
          {probe.message && <code>{probe.message}</code>}
          <div className="actions">
            {probe.error === 'auth' && <button className="btn" onClick={() => setView('settings')}>{t('openSettings')}</button>}
            {probe.error === 'outdated' && <button className="btn" onClick={() => api.updateTools()}>{t('updateNow')}</button>}
            {probe.error !== 'invalid-url' && <button className="btn" onClick={() => download(true)}>{t('tryAnyway')}</button>}
          </div>
        </div>
      )}

      {probe.state === 'ok' && info && (
        <div className="preview">
          <Thumb className="frame" src={info.thumbnail} audio={mode === 'audio'}>
            {info.isLive ? <span className="badge live">{t('live')}</span>
              : info.kind === 'playlist' ? <span className="badge">{t('playlistItems', info.count)}</span>
              : info.duration ? <span className="badge num">{duration(info.duration)}</span> : null}
          </Thumb>

          <div className="preview-body">
            <h2 className="preview-title">{info.title}</h2>
            <div className="preview-meta">
              {info.uploader && <span><User size={14} />{info.uploader}</span>}
              {info.kind === 'playlist' && <span><ListVideo size={14} />{t('playlistItems', info.count)}</span>}
              {info.kind === 'video' && info.duration && <span className="num"><Clock size={14} />{duration(info.duration)}</span>}
              <span><Globe size={14} />{host(url)}</span>
            </div>

            <Segmented label={t('modeVideo')} value={mode} onChange={setMode} options={[
              { value: 'video', label: t('modeVideo'), icon: <Film size={15} /> },
              { value: 'audio', label: t('modeAudio'), icon: <Music size={15} /> },
            ]} />

            {mode === 'video' && (
              <div className="qualities" role="group" aria-label={t('setQuality')}>
                {buckets.map(b => (
                  <button key={b} type="button" className="q" aria-pressed={quality === String(b)} onClick={() => setQuality(String(b))}>
                    <b>{qualityLabel(String(b))}</b>
                    <small className="num">{info.kind === 'video' ? (sizeFor(b) || t('sizeUnknown')) : ' '}</small>
                  </button>
                ))}
                <button type="button" className="q" aria-pressed={quality === 'best'} onClick={() => setQuality('best')}>
                  <b>{t('bestQuality')}</b><small>{t('bestQualitySub')}</small>
                </button>
              </div>
            )}

            <div className="opts">
              {showPlaylistToggle && <CheckChip checked={playlist} onChange={setPlaylist}>{t('optPlaylist')}</CheckChip>}
              {mode === 'video' && <CheckChip checked={subtitles} onChange={setSubtitles}>{t('optSubtitles')}</CheckChip>}
              <CheckChip checked={thumbnail} onChange={setThumbnail}>{t('optThumbnail')}</CheckChip>
            </div>

            <div className="go">
              <button className="btn primary big" onClick={() => download()}><Download size={18} />{buttonLabel}</button>
              <span className="dest">{t('saveTo')}
                <button title={settings?.downloadsDir} onClick={async () => { const s = await api.pickFolder(); if (s) setSettingsState(s); }}>
                  {settings?.downloadsDir?.split(/[\\/]/).slice(-2).join('/')}
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <div className="section-head"><h2>{t('queueTitle')}</h2></div>
          <div className="jobs">{active.map(j => <JobRow key={j.id} job={j} />)}</div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <div className="section-head">
            <h2>{t('recentTitle')}</h2>
            <button className="btn ghost" onClick={() => setView('library')}>{t('seeAll')}</button>
          </div>
          <div className="jobs">{recent.map(j => <JobRow key={j.id} job={j} />)}</div>
        </section>
      )}
    </div>
  );
}
