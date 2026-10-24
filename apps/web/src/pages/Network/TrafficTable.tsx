import { useEffect, useState } from 'react';

type Row = { id: string; ts: number; source: string; destination: string; protocol: string; verdict: string; bytes: number };

export function TrafficTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const [verdict, setVerdict] = useState('ALL');
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onmessage = (ev) => { try { const r = JSON.parse(ev.data); setRows((prev) => [r, ...prev].slice(0, 200)); } catch { /* ignore */ } };
    es.onerror = () => setConnected(false);
    es.onopen = () => setConnected(true);
    return () => es.close();
  }, []);

  const filtered = rows.filter((r) => (verdict === 'ALL' || r.verdict === verdict) && (r.destination + r.source + r.protocol).toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="rounded-lg bg-surface-1 p-4">
      {!connected && <div className="mb-2 text-warn">Reconnecting…</div>}
      <div className="mb-2 flex gap-2">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="search" className="rounded bg-surface-2 px-2 py-1 text-sm" />
        <select value={verdict} onChange={(e) => setVerdict(e.target.value)} className="rounded bg-surface-2 px-2 py-1 text-sm">
          <option>ALL</option><option>LOCAL</option><option>BLOCKED</option>
        </select>
      </div>
      {filtered.length === 0 ? <div className="text-ink-faint">No traffic yet. Trigger a red-team attempt.</div> : (
        <table className="w-full text-sm">
          <thead><tr className="text-ink-dim"><th>time</th><th>source</th><th>dest</th><th>protocol</th><th>verdict</th><th>bytes</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="font-mono">{new Date(r.ts).toLocaleTimeString()}</td>
                <td>{r.source}</td><td>{r.destination}</td><td>{r.protocol}</td>
                <td>{r.verdict === 'BLOCKED' ? '⛔ BLOCKED' : '✓ LOCAL'}</td>
                <td className="font-mono">{r.bytes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
