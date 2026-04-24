import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sessionsApi, assetsApi } from '../../api/client'
import type { JobRead } from '../../api/client'
import { Breadcrumb }   from './components/Breadcrumb'
import { ViewerPane }   from './components/ViewerPane'
import { DetailPanel }  from './components/DetailPanel'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => sessionsApi.get(id!),
    enabled: !!id,
    // Poll toutes les 5s tant que le pipeline tourne
    refetchInterval: (query) => {
      const status = query.state.data?.status
      const active = ['acquiring', 'acquired', 'processing', 'processed', 'exporting']
      return status && active.includes(status) ? 5_000 : false
    },
  })

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', { session_id: id }],
    queryFn: () => assetsApi.list({ session_id: id }),
    enabled: !!id,
    refetchInterval: session?.status === 'processing' ? 10_000 : false,
  })

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', color: 'var(--tx-2)', fontSize: '12px',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          stroke="currentColor" strokeWidth="2"
          style={{ animation: 'spin 0.8s linear infinite' }}>
          <path d="M7 1a6 6 0 010 12" />
        </svg>
        Chargement de la session…
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '12px',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
          stroke="var(--er-bd)" strokeWidth="1.5">
          <circle cx="16" cy="16" r="13" />
          <line x1="16" y1="10" x2="16" y2="18" />
          <circle cx="16" cy="22" r="1" fill="var(--er-bd)" />
        </svg>
        <span style={{ fontSize: '12px', color: 'var(--er)' }}>
          Session introuvable
        </span>
        <button
          onClick={() => navigate('/sessions')}
          style={{
            fontSize: '11px', padding: '5px 12px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--tx-1)',
          }}
        >
          ← Retour aux sessions
        </button>
      </div>
    )
  }

  const jobs = (session.jobs ?? []) as JobRead[]

  // ── Layout principal ──────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      <Breadcrumb session={session} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ViewerPane  session={session} assets={assets} />
        <DetailPanel session={session} jobs={jobs} />
      </div>
    </div>
  )
}