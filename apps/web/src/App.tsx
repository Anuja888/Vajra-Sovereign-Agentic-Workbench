import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/shell/AppShell';
import { NotFound } from './components/shell/SoonPage';
import NetworkPage from './pages/Network';
import WorkbenchPage from './pages/Workbench';
import ModelsPage from './pages/Models';
import KnowledgePage from './pages/Knowledge';
import RunsPage from './pages/Runs';
import AdminPage from './pages/Admin';
import EvalsPage from './pages/Evals';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/workbench" replace />} />
            <Route path="/workbench" element={<WorkbenchPage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/evals" element={<EvalsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
