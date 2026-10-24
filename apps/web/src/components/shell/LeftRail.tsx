import { NavLink } from 'react-router-dom';
import {
  LayoutGrid, Radio, Cpu, BookOpen, Play, Shield, BarChart2, Settings
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

const items = [
  { to: '/workbench', label: 'Workbench', icon: LayoutGrid },
  { to: '/network', label: 'Network', icon: Radio },
  { to: '/models', label: 'Models', icon: Cpu },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/runs', label: 'Runs', icon: Play },
  { to: '/evals', label: 'Evals', icon: BarChart2 },
  { to: '/admin', label: 'Admin', icon: Shield },
];

interface ModelEntry {
  id: string;
  installed: boolean;
  vramGb: number;
  provider: string;
  health: { vramUsedGb: number; tokensPerSec: number };
}

export function LeftRail({ mobile = false }: { mobile?: boolean }) {
  const { data: stats } = useQuery<{ blocked: number; externalBytes: number; local: number }>({
    queryKey: ['stats'],
    queryFn: async () => {
      const r = await fetch(`${API}/api/network/stats`);
      return r.json();
    },
    refetchInterval: 3000,
  });

  const { data: models } = useQuery<ModelEntry[]>({
    queryKey: ['models-mini'],
    queryFn: async () => {
      const r = await fetch(`${API}/api/models`);
      return r.json();
    },
    refetchInterval: 10000,
  });

  // Compute VRAM summary from live model data
  const installedModels = models?.filter(m => m.installed) ?? [];
  const vramUsed = installedModels.reduce((s, m) => s + (m.health?.vramUsedGb ?? 0), 0);
  // Total VRAM: show 24 GB as nominal; simulated shows 0
  const isSimulated = installedModels.length === 1 && installedModels[0]?.provider === 'simulated';
  const vramTotal = isSimulated ? 0 : 24;
  const vramPct = vramTotal > 0 ? Math.min((vramUsed / vramTotal) * 100, 100) : 0;

  if (mobile) {
    return (
      <>
        {items.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${isActive ? 'text-accent' : 'text-ink-dim'}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex items-center justify-center rounded"
            style={{
              background: 'var(--accent)', width: 28, height: 28,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16,
              fontWeight: 700, color: 'var(--accent-ink)',
            }}
          >
            V
          </div>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)', letterSpacing: '0.05em' }}>
              VAJRA
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em', marginTop: -2 }}>
              SOVEREIGN WORKBENCH
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto" aria-label="Primary navigation">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* GPU mini-gauge — live data from /api/models */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            GPU VRAM
          </span>
          {isSimulated ? (
            <span style={{ fontSize: 10, color: 'var(--info)', fontFamily: 'JetBrains Mono, monospace' }}>
              SIMULATED
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--ok)', fontFamily: 'JetBrains Mono, monospace' }}>
              LIVE
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(vramPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`VRAM usage ${Math.round(vramPct)}%`}
          className="progress-bar mb-2"
        >
          <div
            className="progress-fill"
            style={{
              width: isSimulated ? '8%' : `${vramPct}%`,
              background: isSimulated ? 'var(--info)' : vramPct > 80 ? 'var(--danger)' : 'var(--ok)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            {isSimulated ? '0 / 0 GB' : `${vramUsed.toFixed(1)} / ${vramTotal} GB`}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            {installedModels.length} model{installedModels.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Egress pill */}
      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--line)' }}>
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}
          role="status"
          aria-live="polite"
          aria-label={`Air-gapped. ${stats?.blocked ?? 0} blocked attempts.`}
        >
          <span className="dot dot-ok" style={{ width: 6, height: 6 }} />
          <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>AIR-GAPPED</span>
          {stats && stats.blocked > 0 && (
            <span style={{ fontSize: 10, color: 'var(--danger)', marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.blocked}✗
            </span>
          )}
        </div>
      </div>

      {/* Settings */}
      <NavLink
        to="/admin"
        className={({ isActive }) => `nav-item m-2 ${isActive ? 'active' : ''}`}
        aria-label="Admin & Settings"
      >
        <Settings size={16} strokeWidth={1.5} />
        <span>Settings</span>
      </NavLink>
    </div>
  );
}
