import { useEffect, useState } from 'react';
import { FolderOpen, RefreshCw, Wrench, FileText } from 'lucide-react';
import { useApp } from '../state.jsx';
import { api } from '../lib/api.js';
import { Switch } from './common.jsx';

function Row({ label, hint, children, inline }) {
  return (
    <div className={'row' + (inline ? ' inline' : '')}>
      <div><div className="lbl">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <div className="ctl">{children}</div>
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <select className="field" aria-label={label} value={value ?? ''} onChange={e => onChange(e.target.value === '__null' ? null : e.target.value)}>
      {options.map(([v, l]) => <option key={String(v)} value={v === null ? '__null' : v}>{l}</option>)}
    </select>
  );
}

// Text field that saves when you leave it (or press Enter).
function TextSetting({ value, onSave, placeholder, label }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  return (
    <input className="field" aria-label={label} value={v} placeholder={placeholder} spellCheck={false}
      onChange={e => setV(e.target.value)} onBlur={() => v !== value && onSave(v)}
      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
  );
}

export default function SettingsView() {
  const { t, settings: s, updateSettings, setSettingsState, tools, info, toast } = useApp();
  const [working, setWorking] = useState(null);
  if (!s) return null;
  const set = (k) => (v) => updateSettings({ [k]: v });

  const runTool = async (kind) => {
    setWorking(kind);
    const r = kind === 'update' ? await api.updateTools() : await api.repairTools();
    setWorking(null);
    if (r?.error) toast(r.error, 'error');
    else toast(kind === 'update' ? t('toastUpdated', r?.ytdlpVersion || '') : t('toastRepaired'), 'success');
  };

  return (
    <div className="page">
      <h1 className="page-title">{t('navSettings')}</h1>

      <section className="set-group">
        <h2>{t('setDownloads')}</h2>
        <Row label={t('setFolder')}>
          <span className="path" title={s.downloadsDir}>{s.downloadsDir}</span>
          <button className="btn" onClick={async () => { const r = await api.pickFolder(); if (r) setSettingsState(r); }}>{t('change')}</button>
          <button className="icon-btn" aria-label={t('actReveal')} title={t('actReveal')} onClick={() => api.openDownloads()}><FolderOpen size={16} /></button>
        </Row>
        <Row label={t('setQuality')}>
          <Select label={t('setQuality')} value={s.quality} onChange={set('quality')} options={[
            ['best', t('bestQuality')], ['2160', '4K (2160p)'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p'],
          ]} />
        </Row>
        <Row label={t('setContainer')} hint={t('setContainerHint')}>
          <Select label={t('setContainer')} value={s.container} onChange={set('container')} options={[['mp4', 'MP4'], ['mkv', 'MKV']]} />
        </Row>
        {s.container === 'mp4' && (
          <Row inline label={t('setCompat')} hint={t('setCompatHint')}>
            <Switch label={t('setCompat')} checked={s.preferCompatible} onChange={set('preferCompatible')} />
          </Row>
        )}
        <Row label={t('setAudio')}>
          <Select label={t('setAudio')} value={s.audioFormat} onChange={set('audioFormat')} options={[
            ['mp3', 'MP3'], ['m4a', 'M4A (AAC)'], ['opus', 'Opus'], ['flac', 'FLAC'], ['wav', 'WAV'],
          ]} />
        </Row>
        <Row label={t('setParallel')}>
          <Select label={t('setParallel')} value={String(s.maxConcurrent)} onChange={v => updateSettings({ maxConcurrent: Number(v) })}
            options={[1, 2, 3, 4, 5].map(n => [String(n), String(n)])} />
        </Row>
        <Row label={t('setLimit')} hint={t('setLimitHint')}>
          <TextSetting label={t('setLimit')} value={s.speedLimit} placeholder="5M" onSave={set('speedLimit')} />
        </Row>
        <Row label={t('setTemplate')} hint={t('setTemplateHint')}>
          <TextSetting label={t('setTemplate')} value={s.filenameTemplate} onSave={set('filenameTemplate')} />
        </Row>
        <Row label={t('setSubLangs')}>
          <TextSetting label={t('setSubLangs')} value={s.subLangs} placeholder="pl,en" onSave={set('subLangs')} />
        </Row>
        <Row inline label={t('setMetadata')}>
          <Switch label={t('setMetadata')} checked={s.embedMetadata} onChange={set('embedMetadata')} />
        </Row>
      </section>

      <section className="set-group">
        <h2>{t('setAccess')}</h2>
        <Row label={t('setCookies')} hint={t('setCookiesHint')}>
          <Select label={t('setCookies')} value={s.cookiesFromBrowser} onChange={set('cookiesFromBrowser')} options={[
            ['', t('setCookiesNone')], ['firefox', 'Firefox'], ['chrome', 'Chrome'], ['edge', 'Edge'], ['brave', 'Brave'], ['opera', 'Opera'], ['vivaldi', 'Vivaldi'],
          ]} />
        </Row>
      </section>

      <section className="set-group">
        <h2>{t('setApp')}</h2>
        <Row label={t('setLanguage')}>
          <Select label={t('setLanguage')} value={s.language} onChange={set('language')} options={[[null, t('setLanguageAuto')], ['pl', 'Polski'], ['en', 'English']]} />
        </Row>
        <Row inline label={t('setClipboard')}><Switch label={t('setClipboard')} checked={s.watchClipboard} onChange={set('watchClipboard')} /></Row>
        <Row inline label={t('setNotify')}><Switch label={t('setNotify')} checked={s.notifications} onChange={set('notifications')} /></Row>
        <Row inline label={t('setTray')}><Switch label={t('setTray')} checked={s.closeToTray} onChange={set('closeToTray')} /></Row>
      </section>

      <section className="set-group">
        <h2>{t('setTools')}</h2>
        <Row inline label={t('setYtdlp')}>
          <span className={'ver num' + (tools?.ytdlp ? '' : ' missing')}>{tools?.ytdlpVersion || t('setMissing')}</span>
        </Row>
        <Row inline label={t('setFfmpeg')}>
          <span className={'ver num' + (tools?.ffmpeg ? '' : ' missing')}>{tools?.ffmpegVersion || (tools?.ffmpeg ? '✓' : t('setMissing'))}</span>
        </Row>
        <Row inline label={t('setAutoUpdate')}>
          <Switch label={t('setAutoUpdate')} checked={s.autoUpdateYtdlp} onChange={set('autoUpdateYtdlp')} />
        </Row>
        <div className="set-actions">
          <button className="btn" disabled={!!working || tools?.busy} onClick={() => runTool('update')}><RefreshCw size={15} className={working === 'update' ? 'spin' : ''} />{t('setUpdate')}</button>
          <button className="btn" disabled={!!working || tools?.busy} onClick={() => runTool('repair')}><Wrench size={15} />{t('setRepair')}</button>
          <button className="btn ghost" onClick={() => api.openLog()}><FileText size={15} />{t('setLog')}</button>
        </div>
      </section>

      <section className="set-group">
        <h2>{t('setExtension')}</h2>
        <p className="prose">{t('setExtensionBody')}<br />{t('setExtensionPort', info?.port)}</p>
        <p className="prose">{t('setAbout', info?.version || '')}</p>
      </section>
    </div>
  );
}
