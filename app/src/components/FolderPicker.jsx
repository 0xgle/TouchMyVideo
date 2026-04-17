import { useState, useEffect } from 'react';
import { useLang } from '../i18n/LangContext.jsx';

const isTMV = typeof window !== 'undefined' && !!window.tmv;

export default function FolderPicker() {
  const { t } = useLang();
  const [dir, setDir] = useState('');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (isTMV) window.tmv.getDownloadsDir().then(setDir);
    else setDir('C:\\Users\\You\\Downloads\\TouchMyVideo');
  }, []);

  const handlePick = async () => {
    if (!isTMV) return;
    setPicking(true);
    const chosen = await window.tmv.pickFolder();
    if (chosen) setDir(chosen);
    setPicking(false);
  };

  const displayDir = dir.length > 44 ? '...' + dir.slice(dir.length - 44) : dir;

  return (
    <div>
      <div style={{ fontFamily:'JetBrains Mono', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--text3)', marginBottom:8 }}>
        {t('folderLabel')}
      </div>
      <div style={{
        display:'flex', alignItems:'center',
        background:'var(--bg2)', border:'1px solid var(--border)',
        borderRadius:12, overflow:'hidden', transition:'border-color 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
      >
        <div style={{ padding:'0 14px', height:48, display:'flex', alignItems:'center', borderRight:'1px solid var(--border)', fontSize:16, flexShrink:0 }}>📁</div>
        <div onClick={() => isTMV && window.tmv.openDownloads()} title={dir} style={{
          flex:1, padding:'0 14px', height:48, display:'flex', alignItems:'center',
          fontFamily:'JetBrains Mono', fontSize:11, color:'var(--text2)',
          cursor:'pointer', overflow:'hidden', whiteSpace:'nowrap', transition:'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color='var(--a)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--text2)'}
        >{displayDir || t('folderLabel')}</div>
        <button onClick={handlePick} disabled={picking} className="no-drag" style={{
          padding:'0 18px', height:48, background:'none',
          border:'none', borderLeft:'1px solid var(--border)',
          color: picking ? 'var(--text3)' : 'var(--text2)',
          cursor: picking ? 'default' : 'pointer',
          fontFamily:'Outfit', fontSize:12, fontWeight:600,
          transition:'all 0.15s', whiteSpace:'nowrap',
          display:'flex', alignItems:'center', gap:6,
        }}
        onMouseEnter={e => { if(!picking){ e.currentTarget.style.color='var(--a)'; e.currentTarget.style.background='var(--adim)'; }}}
        onMouseLeave={e => { e.currentTarget.style.color=picking?'var(--text3)':'var(--text2)'; e.currentTarget.style.background='none'; }}
        >
          {picking ? (
            <><span style={{ width:12, height:12, border:'1.5px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }}/> {t('folderChanging')}</>
          ) : t('folderChange')}
        </button>
      </div>
      <div style={{ marginTop:6, fontSize:10, fontFamily:'JetBrains Mono', color:'var(--text3)', paddingLeft:2 }}>
        {t('folderHint')}
      </div>
    </div>
  );
}
