import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Cpu, CheckCircle, XCircle, Zap, Terminal, ChevronDown, ChevronUp,
  BarChart2, Activity, AlertCircle, ExternalLink
} from 'lucide-react';
import type { ModelManifest } from '@vajra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

type ModelWithHealth = ModelManifest & {
  health: {
    ok: boolean;
    latencyMs: number;
    tokensPerSec: number;
    vramUsedGb: number;
    queueDepth: number;
    error?: string;
  };
};

// ── Router Lens ────────────────────────────────────────────────────────────
function RouterLens() {
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState<any>(null);

  const route = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/models/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, stepId: 'lens-demo' }),
      });
      return r.json();
    },
    onSuccess: setResult,
  });

  const EXAMPLES = [
    'Write Python code to parse a CSV of tank levels',
    'Summarise this inspection SOP in three bullets',
    'Read this scanned P&ID drawing and extract equipment tags',
    'Draft an approval note for a hot-work permit',
  ];

  return (
    <div className="card mb-6">
      <div className="card-header">
        <Zap size={14} style={{ color: 'var(--accent)' }} />
        <span className="font-semibold">Router Lens</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>See which model would be chosen and why</span>
      </div>
      <div className="card-body">
        <div className="flex gap-2 mb-3">
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Describe a task…"
            rows={2}
            style={{
              flex: 1, background: 'var(--surface-2)', border: '1px solid var(--line)',
              borderRadius: 6, padding: '8px 12px', color: 'var(--ink)',
              fontSize: 13, resize: 'none', fontFamily: 'IBM Plex Sans, sans-serif', outline: 'none',
            }}
          />
          <button
            className="btn btn-primary flex-shrink-0"
            onClick={() => route.mutate()}
            disabled={!goal.trim() || route.isPending}
          >
            Analyse
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              className="btn btn-ghost btn-sm"
              onClick={() => setGoal(ex)}
              style={{ fontSize: 11 }}
            >
              {ex.substring(0, 35)}…
            </button>
          ))}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div
                className="p-3 rounded-lg mb-3"
                style={{ background: 'rgba(198,255,61,0.06)', border: '1px solid rgba(198,255,61,0.2)' }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                  → Selected: {result.selectedModel}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-dim)' }}>{result.decisionReason}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.taskAnalysis?.taskTypes?.map((t: string) => (
                    <span key={t} className="chip chip-accent" style={{ fontSize: 10 }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Bar race */}
              <div className="space-y-1.5">
                {(result.scores as any[])
                  .filter(s => !s.eliminated)
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((s, i) => (
                    <div key={s.modelId}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span style={{ fontSize: 11, color: i === 0 ? 'var(--accent)' : 'var(--ink-dim)', fontWeight: i === 0 ? 600 : 400, width: 160, flexShrink: 0 }}>
                          {s.modelId}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', width: 40, flexShrink: 0 }}>
                          {(s.totalScore * 100).toFixed(0)}
                        </span>
                        <div className="flex-1 progress-bar" style={{ height: 6 }}>
                          <motion.div
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${s.totalScore * 100}%` }}
                            transition={{ delay: i * 0.08, duration: 0.5 }}
                            style={{ background: i === 0 ? 'var(--accent)' : 'var(--ok)' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                {(result.scores as any[]).filter(s => s.eliminated).length > 0 && (
                  <details className="mt-2">
                    <summary style={{ fontSize: 11, color: 'var(--ink-faint)', cursor: 'pointer' }}>
                      {(result.scores as any[]).filter(s => s.eliminated).length} models eliminated
                    </summary>
                    <div className="mt-1 space-y-1">
                      {(result.scores as any[]).filter(s => s.eliminated).map(s => (
                        <div key={s.modelId} style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                          {s.modelId}: {s.eliminationReason}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Model card ─────────────────────────────────────────────────────────────
function ModelCard({ model }: { model: ModelWithHealth }) {
  const [expanded, setExpanded] = useState(false);

  const strengthEntries = Object.entries(model.strengths).filter(([_, v]) => v > 0);
  const topStrengths = [...strengthEntries].sort(([,a],[,b]) => b - a).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div
        className="card-header cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 rounded"
            style={{
              width: 8, height: 32,
              background: model.installed ? 'var(--accent)' : 'var(--line)',
              borderRadius: 2,
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{model.displayName}</span>
              {model.installed ? (
                <span className="chip chip-accent" style={{ fontSize: 9 }}>INSTALLED</span>
              ) : (
                <span className="chip chip-public" style={{ fontSize: 9 }}>NOT INSTALLED</span>
              )}
              {model.provider === 'simulated' && (
                <span className="chip chip-simulated" style={{ fontSize: 9 }}>DEMO</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              {model.family} · {model.params} · {model.quantization} · {model.contextWindow / 1000}K ctx · {model.vramGb}GB VRAM
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-6 mr-4 flex-shrink-0">
          <div className="text-right">
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: model.installed ? 'var(--accent)' : 'var(--ink-faint)' }}>
              {model.installed ? model.health.tokensPerSec : '—'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.06em' }}>TOK/S</div>
          </div>
          <div className="text-right">
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              {model.vramGb}
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.06em' }}>GB VRAM</div>
          </div>
          <div style={{ color: model.installed ? 'var(--ok)' : 'var(--ink-faint)' }}>
            {model.installed ? <CheckCircle size={16} /> : <XCircle size={16} />}
          </div>
        </div>

        {expanded ? <ChevronUp size={14} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--ink-faint)', flexShrink: 0 }} />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="card-body border-t" style={{ borderColor: 'var(--line)' }}>
              <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginBottom: 12 }}>{model.description}</p>

              {/* Capabilities */}
              <div className="mb-3">
                <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Strengths</div>
                <div className="space-y-1.5">
                  {strengthEntries.map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span style={{ fontSize: 11, color: 'var(--ink-dim)', width: 140, flexShrink: 0 }}>
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <div className="flex-1 progress-bar" style={{ height: 4 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${val}%`,
                            background: val >= 90 ? 'var(--accent)' : val >= 75 ? 'var(--ok)' : 'var(--ink-faint)',
                          }}
                        />
                      </div>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', width: 28, flexShrink: 0, textAlign: 'right' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modalities */}
              <div className="flex flex-wrap gap-1 mb-3">
                {model.modalities.map(m => (
                  <span key={m} className="chip chip-internal" style={{ fontSize: 10 }}>{m}</span>
                ))}
              </div>

              {/* Pull command or status */}
              {!model.installed && model.pullCommand && (
                <div className="p-2 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginBottom: 4 }}>Pull command:</div>
                  <code style={{ fontSize: 12, color: 'var(--ok)' }}>{model.pullCommand}</code>
                </div>
              )}

              {model.installed && (
                <div className="grid grid-cols-3 gap-3">
                  <div style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ok)' }}>{model.health.latencyMs}ms</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>Latency</div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{model.health.vramUsedGb.toFixed(1)}GB</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>VRAM used</div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{model.health.queueDepth}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>Queue</div>
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 12 }}>
                License: {model.license} · Provider: {model.provider} · Endpoint: {model.endpoint}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Models page ────────────────────────────────────────────────────────────
export default function ModelsPage() {
  const { data: models, isLoading, refetch } = useQuery<ModelWithHealth[]>({
    queryKey: ['models'],
    queryFn: async () => (await fetch(`${API}/api/models`)).json(),
    refetchInterval: 10000,
  });

  const installed = models?.filter(m => m.installed) ?? [];
  const notInstalled = models?.filter(m => !m.installed) ?? [];
  const totalVram = installed.reduce((s, m) => s + m.vramGb, 0);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="display mb-1" style={{ fontSize: 32, fontWeight: 700 }}>Model Registry</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            All open-weight models run locally. Add a model by dropping a manifest or using the register wizard.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm ml-auto" onClick={() => refetch()}>
          <Activity size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Models', value: models?.length ?? 0, color: 'var(--ink)' },
          { label: 'Installed', value: installed.length, color: 'var(--accent)' },
          { label: 'VRAM in Use', value: `${totalVram.toFixed(0)}GB`, color: 'var(--ok)' },
          { label: 'Mode', value: 'DEMO', color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} className="card p-3">
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
            <div className="metric-medium" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* SIMULATED mode banner */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg mb-6"
        style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)' }}
      >
        <AlertCircle size={14} style={{ color: 'var(--info)', flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 13, color: 'var(--info)', fontWeight: 600 }}>SIMULATED MODEL ACTIVE</span>
          <span style={{ fontSize: 13, color: 'var(--ink-dim)', marginLeft: 8 }}>
            Connect a GPU server running Ollama (localhost:11434) or vLLM (localhost:8000) to enable live inference.
          </span>
        </div>
        <button className="btn btn-ghost btn-sm ml-auto" style={{ borderColor: 'var(--info)', color: 'var(--info)' }}>
          Connect GPU Server
        </button>
      </div>

      {/* Router Lens */}
      <RouterLens />

      {/* Installed */}
      {installed.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <CheckCircle size={12} style={{ color: 'var(--accent)' }} /> Installed ({installed.length})
          </h2>
          <div className="space-y-2">
            {isLoading ? (
              [1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)
            ) : (
              installed.map(m => <ModelCard key={m.id} model={m} />)
            )}
          </div>
        </div>
      )}

      {/* Not installed */}
      {notInstalled.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <XCircle size={12} /> Available to Install ({notInstalled.length})
          </h2>
          <div className="space-y-2">
            {notInstalled.map(m => <ModelCard key={m.id} model={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
