import { useLang } from '../i18n/LangContext.jsx';

const isTMV = typeof window !== 'undefined' && !!window.tmv;

export default function StatusBar({ activeCount, onReinstall }) {
  const { t } = useLang();
  return (
    <div style={{
      height:32, borderTop:'1px solid var(--border)',
      background:'rgba(8,8,8,0.9)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 14px', flexShrink:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'JetBrains Mono', fontSize:10, color:'var(--text3)' }}>
        <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', display:'inline-block' }}/>
        {t('serverLabel')}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {activeCount > 0 && (
          <span style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--a)' }}>
            {t('activeDownloads', activeCount)}
          </span>
        )}
        <Btn onClick={() => isTMV && window.tmv.openDownloads()}>{t('downloaded')} 📁</Btn>
        <Btn onClick={() => isTMV && window.tmv.openLog()}>{t('logs')} 🪲</Btn>
        <Btn onClick={onReinstall} style={{ color:'var(--amber)' }}>{t('repairTools')}</Btn>
      </div>
    </div>
  );
}

function Btn({ onClick, children, style = {} }) {
  return (
    <button onClick={onClick} style={{
      background:'none', border:'none', fontFamily:'JetBrains Mono', fontSize:10,
      color:'var(--text3)', cursor:'pointer', transition:'color 0.15s', padding:'2px 4px', ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.color='var(--a)'}
    onMouseLeave={e => e.currentTarget.style.color=style.color||'var(--text3)'}
    >{children}</button>
  );
}
