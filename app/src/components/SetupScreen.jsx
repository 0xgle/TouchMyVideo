import { useLang } from '../i18n/LangContext.jsx';

export default function SetupScreen({ setup }) {
  const { t } = useLang();
  const { tools = [], pct = 0, label = '', done = false, error = null } = setup;

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:100,
      background:'rgba(8,8,8,0.97)', backdropFilter:'blur(20px)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:28, padding:40,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'var(--a)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(255,255,255,0.3) 0%,transparent 55%)' }}/>
          <span style={{ fontFamily:'Bebas Neue', fontSize:22, color:'#000', position:'relative', zIndex:1 }}>T</span>
        </div>
        <div>
          <div style={{ fontFamily:'Bebas Neue', fontSize:28, letterSpacing:1, color:'var(--text)' }}>Touch<span style={{ color:'var(--a)' }}>My</span>Video</div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color:'var(--text3)', marginTop:1 }}>{t('setupTitle')}</div>
        </div>
      </div>

      <div style={{ width:'100%', maxWidth:400, padding:28, borderRadius:16, background:'var(--bg2)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:20 }}>
        {error ? (
          <>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>❌</div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--red)', marginBottom:6 }}>{t('setupError')}</div>
              <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'JetBrains Mono', lineHeight:1.6 }}>{error}</div>
            </div>
            <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,59,59,0.06)', border:'1px solid rgba(255,59,59,0.2)', fontSize:11, color:'var(--text2)', lineHeight:1.7 }}>
              {t('setupErrorHint')}
            </div>
          </>
        ) : done ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:42, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700, fontFamily:'Bebas Neue', letterSpacing:1, color:'var(--a)' }}>{t('setupDone')}</div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{t('setupTitle')}</div>
              <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>{t('setupDesc')}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {['yt-dlp','ffmpeg'].map(tool => {
                const needed = tools.includes(tool);
                return (
                  <div key={tool} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, fontFamily:'JetBrains Mono', color: needed ? 'var(--text)' : 'var(--text3)' }}>{tool}</div>
                      <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>{tool === 'yt-dlp' ? 'Download engine · ~10 MB' : 'Video converter · ~50 MB'}</div>
                    </div>
                    <span style={{ fontSize:10, fontFamily:'JetBrains Mono', padding:'3px 8px', borderRadius:6, background: needed ? 'var(--adim)' : 'rgba(34,197,94,0.1)', color: needed ? 'var(--a)' : '#22c55e', border:`1px solid ${needed ? 'rgba(0,255,136,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
                      {needed ? t('setupDownloading') : t('setupOk')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontFamily:'JetBrains Mono', fontSize:10, color:'var(--text3)' }}>
                <span>{label}</span>
                <span style={{ color:'var(--a)' }}>{pct}%</span>
              </div>
              <div style={{ height:4, borderRadius:2, background:'var(--bg3)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:2, background:'linear-gradient(90deg,var(--a2),var(--a))', width:pct+'%', transition:'width 0.4s ease', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)', animation:'shimmer 1.2s ease infinite' }}/>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div style={{ fontFamily:'JetBrains Mono', fontSize:9, color:'var(--text3)', textAlign:'center' }}>{t('setupStoredAt')}</div>
    </div>
  );
}
