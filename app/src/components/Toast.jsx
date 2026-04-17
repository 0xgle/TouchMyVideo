export default function Toast({ msg, type }) {
  const colors = {
    success: { border:'rgba(0,255,136,0.3)' },
    error:   { border:'rgba(255,59,59,0.3)' },
    info:    { border:'rgba(59,130,246,0.3)' },
  };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      padding:'10px 16px', borderRadius:12,
      background:'rgba(20,20,20,0.96)',
      border:`1px solid ${c.border}`,
      backdropFilter:'blur(20px)',
      fontSize:13, fontFamily:'Outfit', fontWeight:500,
      color:'var(--text)',
      animation:'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      whiteSpace:'nowrap',
    }}>
      {msg}
    </div>
  );
}
