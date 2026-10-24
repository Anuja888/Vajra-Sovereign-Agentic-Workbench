import { useEffect, useState } from 'react';

export function AuditPanel() {
  const [entries, setEntries] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => { fetch('/api/audit').then((r) => r.json()).then(setEntries); }, []);

  async function verify() {
    const r = await fetch('/api/audit/verify', { method: 'POST' });
    const d = await r.json();
    setStatus(d.ok ? 'OK' : `TAMPERED at ${d.brokenAt}`);
  }

  return (
    <div className="rounded-lg bg-surface-1 p-4">
      <div className="mb-2 flex items-center gap-2 font-bold">
        Audit chain <button onClick={verify} className="rounded bg-surface-3 px-2 py-1 text-xs">Verify chain</button>
        {status && <span className={status === 'OK' ? 'text-ok' : 'text-danger'}>{status}</span>}
      </div>
      <ul className="space-y-1 text-xs">
        {entries.slice(0, 20).map((e) => (
          <li key={e.id} className="font-mono text-ink-dim">{String(e.hash ?? '').slice(0, 16)}…</li>
        ))}
      </ul>
    </div>
  );
}
