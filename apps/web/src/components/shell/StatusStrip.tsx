import { useQuery } from '@tanstack/react-query';
import { Shield, Lock, User, AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

async function fetchStats() {
  const r = await fetch(`${API}/api/network/stats`);
  if (!r.ok) throw new Error('Server unreachable');
  return r.json() as Promise<{ externalBytes: number; blocked: number; local: number }>;
}

export function StatusStrip() {
  const { data, isError } = useQuery({ queryKey: ['stats'], queryFn: fetchStats, refetchInterval: 2000 });

  return (
    <header
      className="flex items-center gap-3 px-4"
      style={{
        height: 36,
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--line)',
        fontSize: 11,
        letterSpacing: '0.04em',
        flexShrink: 0,
        zIndex: 40,
      }}
      role="banner"
      aria-label="System status"
    >
      {/* Air-gap seal */}
      <div className="flex items-center gap-1.5" style={{ color: 'var(--ok)' }}>
        <Shield size={12} />
        <span className="font-semibold" style={{ letterSpacing: '0.08em' }}>AIR-GAPPED</span>
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

      {/* External bytes */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--ink-faint)' }}>EXT BYTES</span>
        <span className="mono font-semibold" style={{ color: data?.externalBytes === 0 ? 'var(--ok)' : 'var(--danger)' }}>
          {data?.externalBytes ?? 0}
        </span>
      </div>

      {/* Blocked */}
      {data && data.blocked > 0 && (
        <>
          <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
          <div className="flex items-center gap-1" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={10} />
            <span>{data.blocked} BLOCKED</span>
          </div>
        </>
      )}

      <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
      <div style={{ color: 'var(--ink-faint)' }}>LOCAL <span className="mono" style={{ color: 'var(--ink-dim)' }}>{data?.local ?? 0}</span></div>

      {isError && (
        <span style={{ color: 'var(--danger)', fontSize: 10 }}>⚠ Server unreachable</span>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Model mode */}
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded"
        style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', color: 'var(--info)' }}
      >
        <span className="animate-blink">●</span>
        <span className="font-semibold">SIMULATED MODEL</span>
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

      {/* Role */}
      <div className="flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
        <User size={11} />
        <span>Engineer</span>
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

      {/* Classification */}
      <div className="flex items-center gap-1" style={{ color: 'var(--warn)' }}>
        <Lock size={11} />
        <span className="font-semibold">CONFIDENTIAL</span>
      </div>
    </header>
  );
}
