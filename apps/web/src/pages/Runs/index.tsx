import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Pin, Search, Filter, ChevronRight, Download,
  Trash2, Clock, CheckCircle, XCircle, AlertTriangle, BarChart2
} from 'lucide-react';
import type { Run } from '@vajra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

function statusColor(s: Run['status']) {
  const m: Record<string, string> = {
    completed: 'var(--accent)',
    running: 'var(--ok)',
    failed: 'var(--danger)',
    cancelled: 'var(--ink-faint)',
    paused: 'var(--warn)',
  };
  return m[s] ?? 'var(--ink-faint)';
}

function RunRow({ run, onClick }: { run: Run; onClick: () => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => fetch(`${API}/api/runs/${run.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });

  const pin = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/runs/${run.id}/pin`, { method: 'PATCH' });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs'] }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card p-3 cursor-pointer"
      onClick={onClick}
      whileHover={{ borderColor: 'var(--line-strong)' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="dot flex-shrink-0 mt-1"
          style={{ background: statusColor(run.status), boxShadow: run.status === 'running' ? `0 0 8px ${statusColor(run.status)}` : 'none' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {run.pinned && <Pin size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {run.title}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {run.steps.filter(s => s.status === 'completed').length}/{run.steps.length} steps
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {run.facts.length} facts · {run.artifacts.length} artifacts
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {new Date(run.createdAt).toLocaleString()}
            </span>
            <span className={`chip chip-${run.classification}`}>{run.classification}</span>
            <span className={`chip chip-${run.modelMode === 'demo' ? 'simulated' : 'live'}`} style={{ fontSize: 9 }}>
              {run.modelMode === 'demo' ? 'SIMULATED' : 'LIVE'}
            </span>
            {run.tags.map(t => (
              <span key={t} style={{ fontSize: 10, color: 'var(--info)', background: 'rgba(167,139,250,0.1)', padding: '1px 6px', borderRadius: 4 }}>{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {run.artifacts.length > 0 && (
            <Download size={13} style={{ color: 'var(--ink-faint)' }} />
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); pin.mutate(); }}
            style={{ padding: '4px 8px' }}
            aria-label={run.pinned ? 'Unpin run' : 'Pin run'}
            title={run.pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin size={12} style={{ color: run.pinned ? 'var(--accent)' : 'var(--ink-faint)' }} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={e => { e.stopPropagation(); del.mutate(); }}
            style={{ padding: '4px 8px' }}
            aria-label="Delete run"
          >
            <Trash2 size={12} style={{ color: 'var(--danger)' }} />
          </button>
          <ChevronRight size={14} style={{ color: 'var(--ink-faint)' }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function RunsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  const { data: runs, isLoading } = useQuery<Run[]>({
    queryKey: ['runs'],
    queryFn: async () => (await fetch(`${API}/api/runs`)).json(),
    refetchInterval: 5000,
  });

  const filtered = (runs ?? []).filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: runs?.length ?? 0,
    running: runs?.filter(r => r.status === 'running').length ?? 0,
    completed: runs?.filter(r => r.status === 'completed').length ?? 0,
    failed: runs?.filter(r => r.status === 'failed').length ?? 0,
  };

  if (selectedRun) {
    return (
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => setSelectedRun(null)}>← Back to Runs</button>
        <div className="card">
          <div className="card-header">
            <span className="dot" style={{ background: statusColor(selectedRun.status) }} />
            <span className="font-semibold">{selectedRun.title}</span>
            <span className={`chip chip-${selectedRun.classification} ml-auto`}>{selectedRun.classification}</span>
          </div>
          <div className="card-body">
            <div style={{ fontSize: 13, color: 'var(--ink-dim)', marginBottom: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 6 }}>
              {selectedRun.goal}
            </div>

            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Plan ({selectedRun.steps.length} steps)
            </h3>
            <div className="space-y-2 mb-6">
              {selectedRun.steps.map(step => (
                <div key={step.id} className="flex items-center gap-3 p-2 rounded" style={{ background: 'var(--surface-2)' }}>
                  {step.status === 'completed' ? <CheckCircle size={13} style={{ color: 'var(--accent)' }} /> :
                   step.status === 'failed' ? <XCircle size={13} style={{ color: 'var(--danger)' }} /> :
                   <Clock size={13} style={{ color: 'var(--ink-faint)' }} />}
                  <span style={{ fontSize: 11, color: 'var(--ink-dim)', flex: 1 }}>{step.goal}</span>
                  {step.tool && <span className="mono" style={{ fontSize: 10, color: 'var(--info)' }}>{step.tool}</span>}
                </div>
              ))}
            </div>

            {selectedRun.artifacts.length > 0 && (
              <>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Artifacts
                </h3>
                <div className="space-y-2">
                  {selectedRun.artifacts.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div className="flex-1">
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{(a.sizeBytes / 1024).toFixed(0)}KB · v{a.version}</div>
                      </div>
                      <a href={`${API}/api/artifacts/${a.id}/download`} className="btn btn-primary btn-sm" download={a.name}>
                        <Download size={12} /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="display mb-1" style={{ fontSize: 32, fontWeight: 700 }}>Run History</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            All agent runs with their plans, facts, and deliverables.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Runs', value: stats.total, color: 'var(--ink)' },
          { label: 'Running', value: stats.running, color: 'var(--ok)' },
          { label: 'Completed', value: stats.completed, color: 'var(--accent)' },
          { label: 'Failed', value: stats.failed, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
            <div className="metric-medium" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1" style={{ background: 'var(--surface-1)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 12px' }}>
          <Search size={13} style={{ color: 'var(--ink-faint)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search runs…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 13 }}
          />
        </div>
        <div className="flex gap-1">
          {['', 'running', 'completed', 'failed'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilterStatus(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Runs list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(run => (
            <RunRow key={run.id} run={run} onClick={() => setSelectedRun(run)} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
              {search || filterStatus ? 'No runs match your filters' : 'No runs yet — start a task in the Workbench'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
