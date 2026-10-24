import { Outlet } from 'react-router-dom';
import { LeftRail } from './LeftRail';
import { StatusStrip } from './StatusStrip';
import { useState } from 'react';

export function AppShell() {
  const [inspectorTab, setInspectorTab] = useState<'trace' | 'facts' | 'sources' | 'router' | 'network'>('trace');

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:text-accent-ink focus:px-4 focus:py-2 focus:rounded">
        Skip to content
      </a>
      <StatusStrip />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 36px)' }}>
        {/* Left Rail */}
        <aside className="hidden md:flex flex-col flex-shrink-0" style={{ width: 220, background: 'var(--surface-1)', borderRight: '1px solid var(--line)' }}>
          <LeftRail />
        </aside>

        {/* Main content */}
        <main id="main" className="flex-1 overflow-auto">
          <Outlet context={{ inspectorTab, setInspectorTab }} />
        </main>

        {/* Mobile bottom bar */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around"
          style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--line)', height: 56, zIndex: 50 }}
          aria-label="Mobile navigation"
        >
          <LeftRail mobile />
        </nav>
      </div>
    </div>
  );
}
