import LangSwitcher from './LangSwitcher.jsx';
import { useLang } from '../i18n/LangContext.jsx';

const isTMV = typeof window !== 'undefined' && !!window.tmv;

export default function TitleBar({ activeCount }) {
  const { t } = useLang();

  return (
    <div className="drag" style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 0 0 16px', height:52, flexShrink:0,
      borderBottom:'1px solid var(--border)',
      background:'rgba(8,8,8,0.85)',
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          width:28, height:28, borderRadius:8, background:'var(--a)',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', overflow:'hidden', flexShrink:0,
        }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.3) 0%,transparent 55%)' }}/>
          <span style={{ fontFamily:'Bebas Neue', fontSize:15, color:'#000', position:'relative', zIndex:1 }}>T</span>
        </div>
        <span style={{ fontFamily:'Bebas Neue', fontSize:20, letterSpacing:1, color:'var(--text)' }}>
          Touch<span style={{ color:'var(--a)' }}>My</span>Video
        </span>
        <span style={{
          fontFamily:'JetBrains Mono', fontSize:9,
          padding:'2px 7px', borderRadius:5,
          background:'var(--adim)', color:'var(--a)',
          border:'1px solid rgba(0,255,136,0.18)',
        }}>{t('appVersion')}</span>
      </div>

      {/* Center: active indicator + lang switcher */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {activeCount > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'JetBrains Mono', fontSize:10, color:'var(--a)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--a)', animation:'pulse 1.5s ease infinite', display:'inline-block' }}/>
            {t('activeDownloads', activeCount)}
          </div>
        )}
        <LangSwitcher />
      </div>

      {/* Window controls */}
      <div className="no-drag" style={{ display:'flex', alignItems:'stretch', height:'100%' }}>
        <WinBtn onClick={() => isTMV && window.tmv.minimize()} title="Minimize" icon={<MinimizeIcon />} hoverBg="rgba(255,255,255,0.08)" />
        <WinBtn onClick={() => isTMV && window.tmv.maximize()} title="Maximize" icon={<MaximizeIcon />} hoverBg="rgba(255,255,255,0.08)" />
        <WinBtn onClick={() => isTMV && window.tmv.close()} title="Hide to tray" icon={<CloseIcon />} hoverBg="#e81123" hoverColor="#fff" />
      </div>
    </div>
  );
}

function WinBtn({ onClick, title, icon, hoverBg, hoverColor = '#fff' }) {
  return (
    <button onClick={onClick} title={title} style={{
      width:46, height:'100%', border:'none', background:'transparent',
      color:'var(--text2)', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'background 0.12s, color 0.12s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background=hoverBg; e.currentTarget.style.color=hoverColor; }}
    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)'; }}
    >{icon}</button>
  );
}

const MinimizeIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect y="8" width="10" height="1.5" rx="0.5"/></svg>;
const MaximizeIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.6" y="0.6" width="8.8" height="8.8" rx="0.5"/></svg>;
const CloseIcon   = () => <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>;
