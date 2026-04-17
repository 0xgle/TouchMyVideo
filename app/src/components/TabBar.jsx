import { useLang } from '../i18n/LangContext.jsx';

export default function TabBar({ tab, setTab, historyCount, activeCount }) {
  const { t } = useLang();
  const tabs = [
    { id:'download', label: t('tabDownload') },
    { id:'history',  label: t('tabHistory'), count: historyCount },
  ];
  return (
    <div style={{
      display:'flex', alignItems:'center', padding:'0 18px',
      borderBottom:'1px solid var(--border)', flexShrink:0,
      background:'rgba(8,8,8,0.6)',
    }}>
      {tabs.map(tb => (
        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
          padding:'13px 16px', fontSize:13, fontWeight:500,
          fontFamily:'Outfit', color: tab === tb.id ? 'var(--text)' : 'var(--text3)',
          background:'none', border:'none', cursor:'pointer',
          borderBottom: tab === tb.id ? '2px solid var(--a)' : '2px solid transparent',
          transition:'all 0.2s', display:'flex', alignItems:'center', gap:6,
        }}>
          {tb.label}
          {tb.count > 0 && (
            <span style={{
              fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700,
              width:16, height:16, borderRadius:'50%',
              background:'var(--a)', color:'#000',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>{tb.count > 99 ? '99+' : tb.count}</span>
          )}
        </button>
      ))}
      <div style={{ flex:1 }}/>
      {activeCount > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'JetBrains Mono', fontSize:10, color:'var(--a)', paddingBottom:2 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--a)', display:'inline-block', animation:'pulse 1.5s ease infinite' }}/>
          {t('downloading')}
        </div>
      )}
    </div>
  );
}
