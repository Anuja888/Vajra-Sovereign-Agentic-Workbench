import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeftRail } from './components/shell/LeftRail';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

test('LeftRail renders all nav items', () => {
  render(<Wrapper><LeftRail /></Wrapper>);
  for (const n of ['Workbench', 'Network', 'Models', 'Knowledge', 'Runs', 'Evals', 'Admin']) {
    expect(screen.getByText(n)).toBeTruthy();
  }
});
