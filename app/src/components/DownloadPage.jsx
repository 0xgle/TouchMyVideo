import { useState } from 'react';
import FolderPicker from './FolderPicker.jsx';
import { useLang } from '../i18n/LangContext.jsx';

const QUALITIES = [
  { id:'4K',    label:'4K',   sub:'2160p' },
  { id:'1080p', label:'FHD',  sub:'1080p' },
  { id:'720p',  label:'HD',   sub:'720p'  },
  { id:'480p',  label:'SD',   sub:'480p'  },
  { id:'best',  label:'AUTO', sub:'best'  },
];

const SITES = [
  { name:'YouTube',      color:'#ff0000' },
  { name:'Vimeo',        color:'#19b7ea' },
  { name:'X / Twitter',  color:'#e7e9ea' },
  { name:'Facebook',     color:'#1877f2' },
  { name:'Instagram',    color:'#e1306c' },
  { name:'TikTok',       color:'#fe2c55' },
  { name:'Dailymotion',  color:'#0066dc' },
  { name:'Twitch',       color:'#9147ff' },
  { name:'+ 1000 more',  color:'var(--text3)' },
];

const isTMV = typeof window !== 'undefined' && !!window.tmv;

function ActiveCard({ id, data, onCancel, t }) {
  const [cancelling, setCancelling] = useState(false);
  const handle = async () => {
    setCancelling(true);
    if (isTMV) await window.tmv.cancelDownload(id);
    onCancel(id);
  };
  return (
    <div style={{ padding:16, borderRadius:14, background:'var(--bg2)', border:'1px solid rgba(0,255,136,0.18)', animation:'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{data.title || '...'}</div>
        </div>
        <div style={{ fontFamily:'Bebas Neue', fontSize:26, color:'var(--a)', flexShrink:0, lineHeight:1 }}>{Math.round(data.progress||0)}%</div>
        <button onClick={handle} disabled={cancelling} className="no-drag" style={{
          width:32, height:32, borderRadius:8, flexShrink:0,
          background: cancelling ? 'var(--bg3)' : 'rgba(255,59,59,0.12)',
          border:`1px solid ${cancelling ? 'var(--border)' : 'rgba(255,59,59,0.3)'}`,
          color: cancelling ? 'var(--text3)' : 'var(--red)',
          cursor: cancelling ? 'default' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        }}
        onMouseEnter={e => { if(!cancelling){ e.currentTarget.style.background='rgba(255,59,59,0.22)'; }}}
        onMouseLeave={e => { e.currentTarget.style.background=cancelling?'var(--bg3)':'rgba(255,59,59,0.12)'; }}
        >{cancelling ? '…' : '■'}</button>
      </div>
      <div style={{ height:3, borderRadius:2, background:'var(--bg3)', overflow:'hidden', marginBottom:10 }}>
        <div style={{ height:'100%', borderRadius:2, background:'linear-gradient(90deg,var(--a2),var(--a))', width:`${data.progress||0}%`, transition:'width 0.3s linear', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)', animation:'shimmer 1.2s ease infinite' }}/>
        </div>
      </div>
      <div style={{ display:'flex', gap:16, fontFamily:'JetBrains Mono', fontSize:10, color:'var(--text3)' }}>
        {data.speed && <span>↓ {data.speed}</span>}
        {data.eta   && <span>⏱ {data.eta}</span>}
        {data.size  && <span>📦 {data.size}</span>}
      </div>
    </div>
  );
}

export default function DownloadPage({ onDownload, activeDownloads, onCancel }) {
  const { t } = useLang();
  const [url, setUrl]             = useState('');
  const [quality, setQuality]     = useState('1080p');
  const [audioOnly, setAudioOnly] = useState(false);
  const [subtitles, setSubtitles] = useState(false);
  const [thumbnail, setThumbnail] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleDownload = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    await onDownload({ url: url.trim(), quality, audioOnly, subtitles, thumbnail });
    setTimeout(() => { setLoading(false); setUrl(''); }, 600);
  };

  const activeList  = Object.entries(activeDownloads);
  const canDownload = url.trim().length > 0 && !loading;

  const Label = ({ k }) => (
    <div style={{ fontFamily:'JetBrains Mono', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text3)', marginBottom:8 }}>
      {t(k)}
    </div>
  );

  const OptionCard = ({ id, labelKey, subKey, active, onToggle }) => (
    <div onClick={onToggle} className="no-drag" style={{
      flex:1, padding:'13px 14px', borderRadius:12, cursor:'pointer',
      display:'flex', flexDirection:'column', alignItems:'flex-start', gap:8,
      background: active ? 'var(--adim)' : 'var(--bg2)',
      border:`1px solid ${active ? 'rgba(0,255,136,0.3)' : 'var(--border)'}`,
      transition:'all 0.18s',
    }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color: active ? 'var(--a)' : 'var(--text)' }}>{t(labelKey)}</div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{t(subKey)}</div>
      </div>
      <div style={{ width:36, height:20, borderRadius:10, background: active ? 'var(--a)' : 'var(--bg3)', border:'1px solid var(--border)', position:'relative', transition:'background 0.2s' }}>
        <div style={{ position:'absolute', top:2, left: active ? 16 : 2, width:14, height:14, borderRadius:'50%', background:'white', transition:'left 0.2s' }}/>
      </div>
    </div>
  );

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'22px 20px', display:'flex', flexDirection:'column', gap:20 }}>

      {/* URL Input */}
      <div className="anim-slide-up">
        <Label k="urlLabel" />
        <div className="glow-focus" style={{ display:'flex', alignItems:'center', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', transition:'border-color 0.2s, box-shadow 0.2s' }}>
          <div style={{ padding:'0 14px', fontFamily:'JetBrains Mono', fontSize:11, color:'var(--text3)', borderRight:'1px solid var(--border)', height:52, display:'flex', alignItems:'center', flexShrink:0 }}>URL →</div>
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key==='Enter' && handleDownload()}
            placeholder={t('urlPlaceholder')} className="no-drag"
            style={{ flex:1, background:'none', border:'none', outline:'none', padding:'0 16px', height:52, color:'var(--text)', fontFamily:'JetBrains Mono', fontSize:12 }}
          />
          <button onClick={() => navigator.clipboard.readText().then(t => setUrl(t)).catch(()=>{})} className="no-drag"
            style={{ padding:'0 16px', height:52, background:'none', border:'none', borderLeft:'1px solid var(--border)', color:'var(--text3)', cursor:'pointer', fontSize:11, fontFamily:'Outfit', fontWeight:500, transition:'color 0.15s', whiteSpace:'nowrap' }}
            onMouseEnter={e => e.target.style.color='var(--a)'} onMouseLeave={e => e.target.style.color='var(--text3)'}
          >{t('pasteBtn')}</button>
        </div>
      </div>

      {/* Quality */}
      {!audioOnly && (
        <div className="anim-slide-up delay-1">
          <Label k="qualityLabel" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {QUALITIES.map(q => (
              <button key={q.id} onClick={() => setQuality(q.id)} className="no-drag" style={{
                padding:'10px 4px', borderRadius:10, textAlign:'center', cursor:'pointer',
                background: quality===q.id ? 'var(--adim)' : 'var(--bg2)',
                border:`1px solid ${quality===q.id ? 'rgba(0,255,136,0.4)' : 'var(--border)'}`,
                color: quality===q.id ? 'var(--a)' : 'var(--text2)', transition:'all 0.18s',
              }}>
                <div style={{ fontFamily:'Bebas Neue', fontSize:19, lineHeight:1 }}>{q.label}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:9, opacity:0.6, marginTop:2 }}>{q.sub}</div>
              </button>
            ))}
          </div>
          {(quality==='1080p'||quality==='4K') && (
            <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', fontSize:11, color:'#f59e0b', display:'flex', alignItems:'center', gap:8 }}>
              <span>⚠️</span><span>{t('ffmpegWarning', quality)}</span>
            </div>
          )}
        </div>
      )}

      {/* Options */}
      <div className="anim-slide-up delay-2">
        <Label k="optionsLabel" />
        <div style={{ display:'flex', gap:8 }}>
          <OptionCard id="audio" labelKey="audioOnlyLabel" subKey="audioOnlySub" active={audioOnly} onToggle={() => setAudioOnly(v=>!v)} />
          <OptionCard id="subs"  labelKey="subtitlesLabel" subKey="subtitlesSub" active={subtitles} onToggle={() => setSubtitles(v=>!v)} />
          <OptionCard id="thumb" labelKey="thumbnailLabel" subKey="thumbnailSub" active={thumbnail} onToggle={() => setThumbnail(v=>!v)} />
        </div>
      </div>

      {/* Active downloads */}
      {activeList.length > 0 && (
        <div className="anim-fade-in">
          <div style={{ fontFamily:'JetBrains Mono', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text3)', marginBottom:8 }}>
            {t('activeLabel')} <span style={{ color:'var(--text3)', fontWeight:400 }}>{t('activeHint')}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {activeList.map(([id, data]) => <ActiveCard key={id} id={id} data={data} onCancel={onCancel} t={t} />)}
          </div>
        </div>
      )}

      {/* Folder picker */}
      <FolderPicker />

      {/* Download button */}
      <button onClick={handleDownload} disabled={!canDownload} className="no-drag anim-slide-up delay-3" style={{
        width:'100%', height:58, borderRadius:14, border:'none',
        cursor: canDownload ? 'pointer' : 'default',
        background: canDownload ? 'var(--a)' : 'var(--bg2)',
        color: canDownload ? '#000' : 'var(--text3)',
        fontFamily:'Bebas Neue', fontSize:22, letterSpacing:'1.5px',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        transition:'all 0.2s',
        boxShadow: canDownload ? '0 0 30px rgba(0,255,136,0.25)' : 'none',
      }}
      onMouseEnter={e => { if(canDownload){ e.currentTarget.style.background='#00e87a'; e.currentTarget.style.transform='translateY(-1px)'; }}}
      onMouseLeave={e => { e.currentTarget.style.background=canDownload?'var(--a)':'var(--bg2)'; e.currentTarget.style.transform='none'; }}
      onMouseDown={e => { if(canDownload) e.currentTarget.style.transform='scale(0.98)'; }}
      onMouseUp={e => { if(canDownload) e.currentTarget.style.transform='none'; }}
      >
        {loading ? (
          <span style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ width:16, height:16, border:'2px solid #000', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>
            {t('preparingBtn')}
          </span>
        ) : (
          <span style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>↓</span>
            {audioOnly ? t('downloadMp3Btn') : t('downloadBtn')}
          </span>
        )}
      </button>

      {/* Sites */}
      <div className="anim-slide-up delay-4">
        <Label k="sitesLabel" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
          {SITES.map(s => (
            <div key={s.name} style={{ padding:'8px 10px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:7, fontSize:11, color:'var(--text2)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
              {s.name}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
