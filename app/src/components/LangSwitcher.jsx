import { useState } from 'react';
import { useLang } from '../i18n/LangContext.jsx';

export default function LangSwitcher() {
  const { lang, setLang, LANG_NAMES } = useLang();
  const [open, setOpen] = useState(false);

  const current = LANG_NAMES[lang];

  return (
    <div className="no-drag" style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="Switch language"
        style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'4px 10px', height:28,
          background: open ? 'var(--adim)' : 'transparent',
          border:`1px solid ${open ? 'rgba(0,255,136,0.25)' : 'var(--border)'}`,
          borderRadius:8, cursor:'pointer',
          fontFamily:'JetBrains Mono', fontSize:11,
          color:'var(--text2)', transition:'all 0.15s',
        }}
        onMouseEnter={e => { if(!open){ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text)'; }}}
        onMouseLeave={e => { if(!open){ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}}
      >
        <span style={{ fontSize:13 }}>{current.flag}</span>
        <span>{lang.toUpperCase()}</span>
        <span style={{ fontSize:8, opacity:0.6 }}>▾</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position:'fixed', inset:0, zIndex:98 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div style={{
            position:'absolute', top:'calc(100% + 6px)', right:0,
            background:'var(--bg2)', border:'1px solid var(--border2)',
            borderRadius:10, overflow:'hidden', zIndex:99,
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            minWidth:140,
            animation:'slideUp 0.15s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {Object.entries(LANG_NAMES).map(([code, info]) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false); }}
                style={{
                  width:'100%', padding:'10px 14px',
                  display:'flex', alignItems:'center', gap:10,
                  background: lang === code ? 'var(--adim)' : 'transparent',
                  border:'none', cursor:'pointer',
                  fontFamily:'Outfit', fontSize:13, fontWeight:500,
                  color: lang === code ? 'var(--a)' : 'var(--text2)',
                  transition:'all 0.12s', textAlign:'left',
                }}
                onMouseEnter={e => { if(lang !== code){ e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--text)'; }}}
                onMouseLeave={e => { if(lang !== code){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)'; }}}
              >
                <span style={{ fontSize:16 }}>{info.flag}</span>
                <span>{info.label}</span>
                {lang === code && <span style={{ marginLeft:'auto', fontSize:10, color:'var(--a)' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
