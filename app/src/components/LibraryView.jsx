import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp, ACTIVE } from '../state.jsx';
import { api } from '../lib/api.js';
import { Segmented } from './common.jsx';
import JobRow from './JobRow.jsx';

export default function LibraryView() {
  const { t, jobs } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return jobs.filter(j => {
      if (filter === 'done' && j.status !== 'completed') return false;
      if (filter === 'failed' && !['error', 'cancelled', 'interrupted'].includes(j.status)) return false;
      if (!needle) return true;
      return (j.title || '').toLowerCase().includes(needle) || j.url.toLowerCase().includes(needle) || (j.uploader || '').toLowerCase().includes(needle);
    });
  }, [jobs, q, filter]);

  const hasFinished = jobs.some(j => !ACTIVE.includes(j.status));

  return (
    <div className="page">
      <h1 className="page-title">{t('navLibrary')}</h1>
      <div className="lib-tools">
        <label className="field search">
          <Search size={16} color="var(--faint)" />
          <span className="sr">{t('libSearch')}</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('libSearch')} spellCheck={false} />
        </label>
        <Segmented label={t('filterAll')} value={filter} onChange={setFilter} options={[
          { value: 'all', label: t('filterAll') },
          { value: 'done', label: t('filterDone') },
          { value: 'failed', label: t('filterFailed') },
        ]} />
        {hasFinished && <button className="btn ghost" onClick={() => api.clearFinished()}>{t('clearFinished')}</button>}
      </div>
      {list.length
        ? <div className="jobs">{list.map(j => <JobRow key={j.id} job={j} />)}</div>
        : <div className="lib-empty">{jobs.length ? t('libNoMatch') : t('libEmpty')}</div>}
    </div>
  );
}
