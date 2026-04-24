import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { SessionsPage } from './pages/Session/page'
import { SessionDetailPage } from './pages/SessionDetail/page'
import { SpecimensPage } from './pages/Specimens'
import { PresetsPage } from './pages/Presets'

// ─── Pages (placeholders — seront remplacées une par une) ─────────────────────

function PagePlaceholder({ name }: { name: string }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '12px',
      color: 'var(--tx-2)',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '1px dashed var(--border-2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <line x1="10" y1="7" x2="10" y2="13" />
          <line x1="7" y1="10" x2="13" y2="10" />
        </svg>
      </div>
      <span style={{ fontSize: '12px' }}>{name} — à implémenter</span>
    </div>
  )
}

// ─── QueryClient ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry 1 fois sur erreur (pas 3 — on ne veut pas spammer l'API)
      retry: 1,
      // Stale après 30s — les données sessions changent peu
      staleTime: 30_000,
      // Refetch au focus de fenêtre (utile en dev multi-monitor)
      refetchOnWindowFocus: true,
    },
  },
})

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            {/* Redirect racine → sessions */}
            <Route index element={<Navigate to="/sessions" replace />} />

            {/* Pages à implémenter au fil du développement */}
            <Route path="/sessions" element={<SessionsPage />} />
            <Route
              path="/sessions/:id"
              element={<SessionDetailPage />}
            />
            <Route
              path="/specimens"
              element={<SpecimensPage />}
            />
            <Route
              path="/presets"
              element={<PresetsPage />}
            />
            <Route
              path="/queue"
              element={<PagePlaceholder name="Queue" />}
            />
            <Route
              path="/exports"
              element={<PagePlaceholder name="Exports" />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}