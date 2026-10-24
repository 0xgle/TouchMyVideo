import { useState } from 'react';
import { Check, Film, Music, CircleCheck, CircleAlert, Info } from 'lucide-react';

export function Thumb({ src, audio, className = 'thumb', children }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={className}>
      {src && !broken
        ? <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(true)} />
        : <div className="placeholder">{audio ? <Music size={20} /> : <Film size={20} />}</div>}
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label}
      className="switch" onClick={() => onChange(!checked)} />
  );
}

export function CheckChip({ checked, onChange, children }) {
  return (
    <button type="button" role="checkbox" aria-checked={!!checked} className="check" onClick={() => onChange(!checked)}>
      <span className="box">{checked && <Check size={13} strokeWidth={3} />}</span>
      {children}
    </button>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Toasts({ toasts }) {
  const icon = { success: <CircleCheck size={16} />, error: <CircleAlert size={16} />, info: <Info size={16} /> };
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t => <div key={t.id} className={`toast ${t.kind}`}>{icon[t.kind] || icon.info}<span>{t.msg}</span></div>)}
    </div>
  );
}

export function Bar({ value, indeterminate }) {
  return (
    <div className={'bar' + (indeterminate ? ' indeterminate' : '')} role="progressbar" aria-valuenow={Math.round(value || 0)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
    </div>
  );
}
