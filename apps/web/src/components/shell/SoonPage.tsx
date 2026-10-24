import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export function SoonPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <Construction size={32} className="text-accent" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-ink-dim">{desc}</p>
      <span className="rounded bg-surface-3 px-2 py-0.5 text-xs text-ink-faint">Soon</span>
    </div>
  );
}

export function NotFound() {
  const loc = useLocation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-ink-dim">No route for {loc.pathname}</p>
    </div>
  );
}
