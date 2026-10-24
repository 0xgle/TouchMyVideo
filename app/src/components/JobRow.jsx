import { X, RotateCcw, FolderOpen, Play, Trash2, Link2 } from 'lucide-react';
import { useApp } from '../state.jsx';
import { api } from '../lib/api.js';
import { Thumb, Bar } from './common.jsx';
import { bytes, speed, eta, when, host, qualityLabel } from '../lib/format.js';

export default function JobRow({ job }) {
  const { t, lang, toast } = useApp();
  const audio = job.options?.audioOnly;
  const running = job.status === 'downloading' || job.status === 'processing';
  const active = running || job.status === 'queued';
  const title = job.title && job.title !== job.url ? job.title : host(job.url) || job.url;

  const sub = [];
  sub.push(<span key="st" className={`st ${job.status}`}>{t(`status.${job.status}`)}</span>);
  if (job.status === 'downloading') {
    if (job.item?.count) sub.push(<span key="it" className="num">{t('itemOf', job.item.index || 1, job.item.count)}</span>);
    const of = job.totalBytes ? `${bytes(job.downloadedBytes, lang) || '0'} / ${bytes(job.totalBytes, lang)}` : bytes(job.downloadedBytes, lang);
    if (of) sub.push(<span key="sz" className="num">{of}</span>);
    if (job.speed) sub.push(<span key="sp" className="num">{speed(job.speed, lang)}</span>);
    if (job.eta) sub.push(<span key="eta" className="num">{t('remaining', eta(job.eta))}</span>);
  } else if (!active) {
    sub.push(<span key="q">{audio ? t('audio') : qualityLabel(job.options?.quality) || t('bestQuality')}</span>);
    if (job.status === 'completed' && job.totalBytes) sub.push(<span key="sz" className="num">{bytes(job.totalBytes, lang)}</span>);
    sub.push(<span key="h">{host(job.url)}</span>);
    sub.push(<span key="w">{when(job.finishedAt || job.createdAt, lang)}</span>);
  } else {
    sub.push(<span key="h">{host(job.url)}</span>);
  }

  const copy = async () => { try { await navigator.clipboard.writeText(job.url); toast(t('toastCopied'), 'success'); } catch {} };

  return (
    <div className="job">
      <Thumb src={job.thumbnail} audio={audio} />
      <div className="job-main">
        <div className="job-title" title={title}>{title}</div>
        <div className="job-sub">{sub}</div>
        {running && <Bar value={job.progress} indeterminate={job.status === 'processing' || (!job.progress && !job.totalBytes)} />}
        {job.status === 'error' && <div className="job-err">{t(`errors.${job.errorKind || 'unknown'}`)}</div>}
      </div>
      <div className="job-actions">
        {active && <button className="icon-btn danger" title={t('actCancel')} aria-label={t('actCancel')} onClick={() => api.cancelJob(job.id)}><X size={17} /></button>}
        {job.status === 'completed' && <>
          <button className="icon-btn" title={t('actOpen')} aria-label={t('actOpen')} onClick={() => api.openJob(job.id)}><Play size={16} /></button>
          <button className="icon-btn" title={t('actReveal')} aria-label={t('actReveal')} onClick={() => api.revealJob(job.id)}><FolderOpen size={16} /></button>
        </>}
        {['error', 'cancelled', 'interrupted'].includes(job.status) &&
          <button className="icon-btn" title={t('actRetry')} aria-label={t('actRetry')} onClick={() => api.retryJob(job.id)}><RotateCcw size={16} /></button>}
        {!active && <>
          <button className="icon-btn" title={t('actCopyLink')} aria-label={t('actCopyLink')} onClick={copy}><Link2 size={16} /></button>
          <button className="icon-btn danger" title={t('actRemove')} aria-label={t('actRemove')} onClick={() => api.removeJob(job.id)}><Trash2 size={16} /></button>
        </>}
      </div>
    </div>
  );
}
