import { useLang } from '../i18n/LangContext.jsx';

const isTMV = typeof window !== 'undefined' && !!window.tmv;

function fmt(iso) {
  try { return new Date(iso).toLocaleString(undefined, { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
}

function Badge({ type, label }) {
  const c = {
    ok:      { bg:'rgba(0,255,136,0.08)',  color:'#00ff88', border:'rgba(0,255,136,0.2)' },
    error:   { bg:'rgba(255,59,59,0.08)',  color:'#ff3b3b', border:'rgba(255,59,59,0.2)' },
    active:  { bg:'rgba(245,158,11,0.08)', color:'#f59e0b', border:'rgba(245,158,11,0.2)' },
    quality: { bg:'var(--bg3)', color:'var(--text3)', border:'transparent' },
  }[type] || {};
  return (
    <span style={{ padding:'2px 7px', borderRadius:5, fontFamily:'JetBrains Mono', fontSize:9, fontWeight:500, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>{label}</span>
  );
}

function HistoryItem({ item, isActive, t }) {
  const emoji = (item.audioOnly || item.quality === 'MP3') ? '🎵' : '🎬';
  return (
    <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, transition:'border-color 0.15s', animation:'slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    onMouseEnter={e => e.currentTarget.style.borderColor='var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
    >
      <div style={{ width:46, height:30, borderRadius:6, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{emoji}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4 }}>{item.title || item.url}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          {isActive
            ? <Badge type="active" label={t('badgeDownloading')} />
            : item.status === 'completed'
              ? <Badge type="ok" label={t('badgeOk')} />
              : <Badge type="error" label={t('badgeError')} />
          }
          <Badge type="quality" label={item.quality} />
          <span style={{ fontSize:10, fontFamily:'JetBrains Mono', color:'var(--text3)' }}>{fmt(item.timestamp)}</span>
        </div>
        {isActive && (
          <div style={{ height:2, borderRadius:1, background:'var(--bg3)', overflow:'hidden', marginTop:8 }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,var(--a2),var(--a))', width:`${item.progress||0}%`, transition:'width 0.3s', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)', animation:'shimmer 1.2s ease infinite' }}/>
            </div>
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        {item.status === 'completed' && (
          <ActionBtn onClick={() => isTMV && window.tmv.openDownloads()} title={t('openFolder')}>📁</ActionBtn>
        )}
        {item.status === 'error' && (
          <ActionBtn
            onClick={() => isTMV && window.tmv.startDownload({ url:item.url, quality:item.quality, audioOnly:item.audioOnly })}
            title={t('retry')}
            hoverColor="var(--red)"
          >↺</ActionBtn>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, children, hoverColor = 'var(--a)' }) {
  return (
    <button onClick={onClick} className="no-drag" title={title} style={{ width:32, height:32, borderRadius:8, background:'var(--bg3)', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
    onMouseEnter={e => { e.currentTarget.style.background=`rgba(0,0,0,0.2)`; e.currentTarget.style.color=hoverColor; }}
    onMouseLeave={e => { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--text3)'; }}
    >{children}</button>
  );
}

export default function HistoryPage({ history, activeDownloads, onClear }) {
  const { t } = useLang();
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <span style={{ fontFamily:'JetBrains Mono', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text3)' }}>{t('historyCount', history.length)}</span>
        {history.length > 0 && (
          <button onClick={onClear} className="no-drag" style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontFamily:'Outfit', background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text3)', cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text3)'; }}
          >{t('clearHistory')}</button>
        )}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
        {history.length === 0 ? (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, opacity:0.3 }}>
            <div style={{ fontFamily:'Bebas Neue', fontSize:48, color:'var(--text3)', lineHeight:1 }}>◷</div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text3)' }}>{t('historyEmpty')}</div>
            <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>{t('historyEmptySub')}</div>
          </div>
        ) : history.map(item => (
          <HistoryItem key={item.id} item={item} isActive={!!activeDownloads[item.id]} t={t} />
        ))}
      </div>
    </div>
  );
}
