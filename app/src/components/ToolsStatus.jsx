import { CircleAlert, TriangleAlert } from 'lucide-react';
import { useApp } from '../state.jsx';
import { api } from '../lib/api.js';
import { Bar } from './common.jsx';

// Shown at the top of the download page only when the engine needs attention.
export default function ToolsStatus() {
  const { t, tools } = useApp();
  if (!tools) return null;

  if (tools.busy && tools.task && tools.task !== 'update') {
    return (
      <div className="setup" aria-live="polite">
        <div className="row-h"><strong>{t('toolsInstalling')}</strong><span className="num">{t(`toolsTask.${tools.task}`)} {tools.pct ? `${tools.pct}%` : ''}</span></div>
        <Bar value={tools.pct} indeterminate={!tools.pct || tools.task === 'extract'} />
      </div>
    );
  }

  if (!tools.busy && (!tools.ytdlp || (tools.error && !tools.ffmpeg))) {
    return (
      <div className="notice" role="alert">
        <CircleAlert size={18} />
        <h3>{t('toolsFailed')}</h3>
        {tools.error && <code>{tools.error}</code>}
        <div className="actions"><button className="btn" onClick={() => api.installTools()}>{t('toolsRetry')}</button></div>
      </div>
    );
  }

  if (!tools.busy && tools.ytdlp && !tools.ffmpeg) {
    return (
      <div className="notice warn">
        <TriangleAlert size={18} />
        <h3>ffmpeg</h3>
        <p>{t('toolsNoFfmpeg')}</p>
        {tools.canAutoInstallFfmpeg && <div className="actions"><button className="btn" onClick={() => api.installTools()}>{t('toolsRetry')}</button></div>}
      </div>
    );
  }
  return null;
}
