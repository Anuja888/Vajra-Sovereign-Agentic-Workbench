import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL ?? '';

export function CounterRow() {
  const { data } = useQuery({ queryKey: ['stats2'], queryFn: async () => (await fetch(`${API}/api/network/stats`)).json(), refetchInterval: 2000 });
  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'EXTERNAL BYTES', value: data?.externalBytes ?? 0, color: 'text-danger' },
        { label: 'BLOCKED ATTEMPTS', value: data?.blocked ?? 0, color: 'text-warn' },
        { label: 'LOCAL CALLS', value: data?.local ?? 0, color: 'text-ok' },
      ].map(({ label, value, color }) => (
        <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-surface-1 p-4">
          <div className="text-xs text-ink-dim">{label}</div>
          <div className={`font-mono text-5xl font-bold ${color}`}>{value}</div>
        </motion.div>
      ))}
    </div>
  );
}
