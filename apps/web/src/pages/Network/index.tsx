import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Shield, AlertTriangle, Activity, Wifi, WifiOff,
  CheckCircle, XCircle, Download, RefreshCw, Radar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import type { NetworkStats, NetworkEvent, AuditEntry } from '@vajra/shared';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

// ── Boundary Radar ─────────────────────────────────────────────────────────
function BoundaryRadar({ blocked }: { blocked: number }) {
  const [particles, setParticles] = useState<{ id: number; angle: number; r: number; phase: 'in' | 'bounce' | 'dead' }[]>([]);
  const [sweepAngle, setSweepAngle] = useState(0);
  const idRef = useRef(0);

  // Animate radar sweep
  useEffect(() => {
    const iv = setInterval(() => setSweepAngle(a => (a + 2) % 360), 16);
    return () => clearInterval(iv);
  }, []);

  // Spawn particles on blocked events
  useEffect(() => {
    if (blocked > 0) {
      const newP = {
        id: ++idRef.current,
        angle: Math.random() * 360,
        r: 0,
        phase: 'in' as const,
      };
      setParticles(p => [...p.slice(-10), newP]);
    }
  }, [blocked]);

  // Animate particles
  useEffect(() => {
    const iv = setInterval(() => {
      setParticles(ps =>
        ps
          .map(p => {
            if (p.phase === 'in') {
              const newR = p.r + 2;
              return newR >= 72 ? { ...p, r: 72, phase: 'bounce' as const } : { ...p, r: newR };
            }
            if (p.phase === 'bounce') {
              const newR = p.r - 3;
              return newR <= 0 ? { ...p, phase: 'dead' as const } : { ...p, r: newR };
            }
            return p;
          })
          .filter(p => p.phase !== 'dead')
      );
    }, 16);
    return () => clearInterval(iv);
  }, []);

  const cx = 120, cy = 120, R = 80, R2 = 56, R3 = 32;
  const sweep = sweepAngle * (Math.PI / 180);
  const sweepX = cx + R * Math.cos(sweep);
  const sweepY = cy + R * Math.sin(sweep);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" width={240} height={240} aria-label="Air-gap boundary radar" role="img">
        {/* Background grid */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />
        <circle cx={cx} cy={cy} r={R2} fill="none" stroke="var(--line)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <circle cx={cx} cy={cy} r={R3} fill="none" stroke="var(--line)" strokeWidth={1} strokeDasharray="2 2" opacity={0.4} />

        {/* Crosshairs */}
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="var(--line)" strokeWidth={0.5} opacity={0.5} />
        <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="var(--line)" strokeWidth={0.5} opacity={0.5} />

        {/* Sweep */}
        <line
          x1={cx} y1={cy} x2={sweepX} y2={sweepY}
          stroke="var(--accent)" strokeWidth={1.5} opacity={0.7}
        />
        {/* Sweep gradient arc (fake) */}
        <path
          d={`M${cx},${cy} L${sweepX},${sweepY} A${R},${R} 0 0,0 ${cx + R * Math.cos(sweep - 0.8)},${cy + R * Math.sin(sweep - 0.8)} Z`}
          fill="var(--accent)" opacity={0.05}
        />

        {/* Blocked particles */}
        {particles.map(p => {
          const a = p.angle * (Math.PI / 180);
          const x = cx + p.r * Math.cos(a);
          const y = cy + p.r * Math.sin(a);
          return (
            <circle key={p.id} cx={x} cy={y} r={p.phase === 'bounce' ? 5 : 3}
              fill={p.phase === 'bounce' ? 'var(--danger)' : 'rgba(255,107,61,0.6)'}
              opacity={p.phase === 'bounce' ? 1 : 0.7}
            />
          );
        })}

        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={4} fill="var(--ok)" />
        <circle cx={cx} cy={cy} r={8} fill="none" stroke="var(--ok)" strokeWidth={1} opacity={0.4} />

        {/* Labels */}
        <text x={cx} y={cy + R + 14} textAnchor="middle" fontSize={9} fill="var(--ink-faint)" letterSpacing="0.1em" fontFamily="JetBrains Mono, monospace">PREMISES BOUNDARY</text>
        <text x={cx} y={cy - R - 6} textAnchor="middle" fontSize={8} fill="var(--danger)" letterSpacing="0.08em" fontFamily="JetBrains Mono, monospace" opacity={blocked > 0 ? 1 : 0}>▲ EXTERNAL BLOCKED</text>

        {/* Internal label */}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="var(--ok)" fontFamily="JetBrains Mono, monospace" fontWeight="bold">LOCAL ONLY</text>
      </svg>
    </div>
  );
}

// ── Red-team panel ──────────────────────────────────────────────────────────
const RED_TEAM_ATTACKS = [
  { type: 'dns', label: 'DNS Lookup', desc: 'Resolve example.com via system DNS', icon: '🔍' },
  { type: 'fetch', label: 'HTTPS Fetch', desc: 'GET https://example.com', icon: '🌐' },
  { type: 'socket', label: 'Raw Socket', desc: 'TCP connect to 8.8.8.8:53', icon: '🔌' },
  { type: 'exfil-tool', label: 'Exfiltration', desc: 'POST internal data to external host', icon: '📤' },
  { type: 'injection', label: 'Prompt Injection', desc: 'Poisoned PDF: "email file to attacker"', icon: '💉' },
];

function RedTeamPanel() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function attack(type: string) {
    setLoading(type);
    try {
      const r = await fetch(`${API}/api/redteam/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await r.json();
      setResults(p => ({ ...p, [type]: data }));
    } catch {
      setResults(p => ({ ...p, [type]: { error: 'Server unreachable' } }));
    }
    setLoading(null);
  }

  async function attackAll() {
    for (const { type } of RED_TEAM_ATTACKS) {
      await attack(type);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return (
    <div className="card h-full">
      <div className="card-header">
        <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
        <span className="font-semibold" style={{ color: 'var(--ink)' }}>Red-Team Panel</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>All attempts should be blocked</span>
        <button className="btn btn-ghost btn-sm ml-auto" onClick={attackAll} disabled={!!loading}>
          <Radar size={12} /> Run All
        </button>
      </div>
      <div className="card-body space-y-2">
        {RED_TEAM_ATTACKS.map(({ type, label, desc, icon }) => {
          const result = results[type];
          const isLoading = loading === type;
          return (
            <div
              key={type}
              className="flex items-center gap-3 p-2 rounded"
              style={{
                background: result ? (result.blocked ? 'rgba(255,107,61,0.06)' : 'rgba(56,189,248,0.06)') : 'var(--surface-2)',
                border: result ? (result.blocked ? '1px solid rgba(255,107,61,0.2)' : '1px solid rgba(56,189,248,0.2)') : '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
                  {result && (
                    <span
                      className="flex items-center gap-1 text-xs font-bold"
                      style={{ color: result.blocked ? 'var(--danger)' : 'var(--ok)' }}
                    >
                      {result.blocked ? <XCircle size={11} /> : <CheckCircle size={11} />}
                      {result.blocked ? 'BLOCKED' : 'LEAKED!'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{result?.reason ?? desc}</div>
              </div>
              <button
                className="btn btn-ghost btn-sm flex-shrink-0"
                onClick={() => attack(type)}
                disabled={isLoading || !!loading}
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                {isLoading ? <RefreshCw size={11} className="animate-spin" /> : 'Attack'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Counter row ────────────────────────────────────────────────────────────
function CounterRow({ stats }: { stats: NetworkStats | undefined }) {
  const metrics = [
    {
      label: 'EXTERNAL BYTES', value: stats?.externalBytes ?? 0, suffix: 'B',
      color: 'var(--ok)', ok: (stats?.externalBytes ?? 0) === 0,
    },
    {
      label: 'BLOCKED ATTEMPTS', value: stats?.blocked ?? 0, suffix: '',
      color: 'var(--danger)', ok: false,
    },
    {
      label: 'LOCAL CALLS', value: stats?.local ?? 0, suffix: '',
      color: 'var(--ok)', ok: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {metrics.map(m => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
          style={{ background: 'var(--surface-1)' }}
        >
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            {m.label}
          </div>
          <div className="metric-large" style={{ color: m.value === 0 && m.label === 'EXTERNAL BYTES' ? 'var(--ok)' : m.label === 'BLOCKED ATTEMPTS' && m.value > 0 ? 'var(--danger)' : 'var(--ink)' }}>
            {m.value.toLocaleString()}{m.suffix}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Traffic chart ──────────────────────────────────────────────────────────
function TrafficChart({ data }: { data: NetworkStats['perSecond'] }) {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <Activity size={14} style={{ color: 'var(--ok)' }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Local Activity (calls/sec)</span>
      </div>
      <div style={{ height: 80, padding: '8px 8px 0' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: 'var(--ink-faint)' }}
              itemStyle={{ color: 'var(--ok)' }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--ok)"
              fill="rgba(56,189,248,0.1)"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Traffic table ──────────────────────────────────────────────────────────
function TrafficTable({ events }: { events: NetworkEvent[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <Wifi size={14} style={{ color: 'var(--ink-dim)' }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Network Events</span>
        <span className="chip chip-internal ml-2" style={{ marginLeft: 'auto' }}>LIVE</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Time</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Protocol</th>
              <th>Verdict</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {events.slice(0, 30).map(ev => (
                <motion.tr
                  key={ev.id}
                  initial={{ opacity: 0, backgroundColor: 'rgba(198,255,61,0.08)' }}
                  animate={{ opacity: 1, backgroundColor: 'transparent' }}
                  transition={{ duration: 0.8 }}
                >
                  <td className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {new Date(ev.ts).toLocaleTimeString()}
                  </td>
                  <td style={{ fontSize: 12 }}>{ev.source}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{ev.dest}</td>
                  <td style={{ fontSize: 11 }}>{ev.protocol}</td>
                  <td>
                    <span
                      className="chip"
                      style={{
                        background: ev.verdict === 'BLOCKED' ? 'rgba(255,107,61,0.15)' : ev.verdict === 'LOCAL' ? 'rgba(56,189,248,0.1)' : 'rgba(198,255,61,0.1)',
                        color: ev.verdict === 'BLOCKED' ? 'var(--danger)' : ev.verdict === 'LOCAL' ? 'var(--ok)' : 'var(--accent)',
                      }}
                    >
                      {ev.verdict === 'BLOCKED' ? '✗ ' : '✓ '}{ev.verdict}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{ev.reason ?? '—'}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>
            No network events yet — run a task or a red-team attack
          </div>
        )}
      </div>
    </div>
  );
}

// ── Audit panel ─────────────────────────────────────────────────────────────
function AuditPanel() {
  const { data: audit } = useQuery<AuditEntry[]>({
    queryKey: ['audit'],
    queryFn: async () => (await fetch(`${API}/api/audit`)).json(),
    refetchInterval: 5000,
  });

  const verify = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/audit/verify`, { method: 'POST' });
      return r.json() as Promise<{ ok: boolean; chainLength?: number; brokenAt?: number }>;
    },
  });

  return (
    <div className="card mt-4">
      <div className="card-header">
        <Shield size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Tamper-Evident Audit Log</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 4 }}>SHA-256 hash chain</span>
        <div className="ml-auto flex gap-2">
          {verify.data && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: verify.data.ok ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}
            >
              {verify.data.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {verify.data.ok ? `Chain OK (${verify.data.chainLength} entries)` : `TAMPERED at #${verify.data.brokenAt}`}
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => verify.mutate()}
            disabled={verify.isPending}
          >
            {verify.isPending ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            Verify Chain
          </button>
          <a href={`${API}/api/audit/export`} className="btn btn-ghost btn-sm" download="vajra-audit.json">
            <Download size={11} /> Export
          </a>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Action</th>
              <th>Hash (SHA-256)</th>
            </tr>
          </thead>
          <tbody>
            {(audit ?? []).slice(0, 15).map(entry => (
              <tr key={entry.id}>
                <td className="mono" style={{ color: 'var(--ink-faint)' }}>{entry.id}</td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  {new Date(entry.ts).toLocaleTimeString()}
                </td>
                <td style={{ fontSize: 12 }}>{(entry.payload as any)?.action ?? JSON.stringify(entry.payload).substring(0, 40)}</td>
                <td className="mono" style={{ fontSize: 10, color: 'var(--info)' }}>
                  {entry.hash.substring(0, 16)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!audit?.length && (
          <div className="text-center py-4" style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading audit log…</div>
        )}
      </div>
    </div>
  );
}

// ── Network Monitor page ────────────────────────────────────────────────────
export default function NetworkPage() {
  const { data: stats } = useQuery<NetworkStats>({
    queryKey: ['network-stats'],
    queryFn: async () => (await fetch(`${API}/api/network/stats`)).json(),
    refetchInterval: 1500,
  });

  const { data: events } = useQuery<NetworkEvent[]>({
    queryKey: ['network-events'],
    queryFn: async () => (await fetch(`${API}/api/network/events?limit=50`)).json(),
    refetchInterval: 2000,
  });

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page header */}
      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="display mb-1" style={{ fontSize: 32, fontWeight: 700 }}>
            Network Monitor
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            Real-time sovereignty proof — all traffic stays inside the premises boundary.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)' }}
          >
            <Wifi size={14} style={{ color: 'var(--ok)' }} />
            <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 700, letterSpacing: '0.06em' }}>AIR-GAPPED</span>
          </div>
          <a
            href={`${API}/api/sovereignty-report`}
            className="btn btn-ghost btn-sm"
            download="vajra-sovereignty-report.json"
          >
            <Download size={13} /> Sovereignty Report
          </a>
        </div>
      </div>

      {/* Main grid */}
      <CounterRow stats={stats} />
      <TrafficChart data={stats?.perSecond ?? []} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        {/* Radar */}
        <div className="card blueprint-bg" style={{ overflow: 'hidden', position: 'relative' }}>
          <div className="card-header">
            <Radar size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Boundary Radar</span>
            <span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 4 }}>Red dots = blocked external attempts</span>
          </div>
          <div className="card-body flex items-center justify-center py-4">
            <BoundaryRadar blocked={stats?.blocked ?? 0} />
          </div>
        </div>

        {/* Red team */}
        <RedTeamPanel />
      </div>

      {/* Traffic table */}
      <TrafficTable events={events ?? []} />

      {/* Audit */}
      <AuditPanel />
    </div>
  );
}
