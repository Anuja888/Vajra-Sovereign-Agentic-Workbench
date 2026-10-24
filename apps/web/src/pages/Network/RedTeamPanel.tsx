import { useState } from 'react';

const types = [
  { type: 'dns', label: 'DNS lookup' },
  { type: 'fetch', label: 'HTTPS fetch' },
  { type: 'socket', label: 'Raw socket to 8.8.8.8' },
  { type: 'exfil-tool', label: 'Simulated exfiltration' },
];

export function RedTeamPanel({ onDone }: { onDone?: () => void }) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(t: string) {
    setLoading(t); setError(null);
    try {
      const r = await fetch('/api/redteam/attempt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: t }) });
      const data = await r.json();
      setResults((p) => ({ ...p, [t]: data }));
      onDone?.();
    } catch { setError('server unreachable'); }
    setLoading(null);
  }

  return (
    <div className="rounded-lg bg-surface-1 p-4">
      <div className="mb-2 font-bold">Red-Team</div>
      <div className="flex flex-wrap gap-2">
        {types.map(({ type, label }) => (
          <button key={type} onClick={() => run(type)} disabled={loading === type} className="rounded bg-accent px-3 py-1 text-accent-ink disabled:opacity-50">
            {loading === type ? '…' : label}
          </button>
        ))}
      </div>
      {error && <div className="mt-2 text-danger">{error} <button onClick={() => setError(null)} className="underline">Retry</button></div>}
      <div className="mt-3 space-y-2">
        {Object.entries(results).map(([t, r]) => (
          <div key={t} className="rounded bg-surface-2 p-2 text-sm">
            <span className="text-danger">BLOCKED</span>: {r.reason} — {r.destination}
          </div>
        ))}
      </div>
    </div>
  );
}
