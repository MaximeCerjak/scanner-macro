import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi, assetsApi } from '../../api/client'
import type { JobRead } from '../../api/client'
import { Breadcrumb }  from './components/Breadcrumb'
import { ViewerPane }  from './components/ViewerPane'
import { DetailPanel } from './components/DetailPanel'
import { Spinner }     from '../../components/ui/Shared'

// ─── Barre d'actions contextuelle ────────────────────────────────────────────
// Affichée entre la Breadcrumb et le corps principal.
// Les actions disponibles dépendent du statut courant de la session.

function ActionBar({ sessionId, status }: { sessionId: string; status: string }) {
  const queryClient = useQueryClient()

  const startAcquisition = useMutation({
    mutationFn: () => sessionsApi.startAcquisition(sessionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] }),
  })
  const startProcessing = useMutation({
    mutationFn: () => sessionsApi.startProcessing(sessionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] }),
  })
  const retry = useMutation({
    mutationFn: () => sessionsApi.retry(sessionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] }),
  })

  // Pas d'actions disponibles pour ces statuts
  if (['acquiring', 'processing', 'exporting', 'done'].includes(status)) {
    return null
  }

  const activeMutation = startAcquisition.isPending || startProcessing.isPending || retry.isPending
  const error = startAcquisition.error ?? startProcessing.error ?? retry.error

  return (
    <div style={{
      background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
      padding: '7px 18px', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      {/* draft → lancer l'acquisition */}
      {status === 'draft' && (
        <button
          onClick={() => startAcquisition.mutate()}
          disabled={activeMutation}
          style={{
            fontSize: '12px', fontWeight: 500, padding: '5px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeMutation ? 'var(--bg-3)' : 'var(--ac)',
            color: activeMutation ? 'var(--tx-2)' : 'var(--bg-1)',
            border: 'none', cursor: activeMutation ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {startAcquisition.isPending && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: 'spin 0.8s linear infinite' }}>
              <path d="M5.5 1a4.5 4.5 0 010 9" />
            </svg>
          )}
          Lancer l'acquisition
        </button>
      )}

      {/* acquired → lancer le traitement */}
      {status === 'acquired' && (
        <button
          onClick={() => startProcessing.mutate()}
          disabled={activeMutation}
          style={{
            fontSize: '12px', fontWeight: 500, padding: '5px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeMutation ? 'var(--bg-3)' : 'var(--ac)',
            color: activeMutation ? 'var(--tx-2)' : 'var(--bg-1)',
            border: 'none', cursor: activeMutation ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {startProcessing.isPending && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: 'spin 0.8s linear infinite' }}>
              <path d="M5.5 1a4.5 4.5 0 010 9" />
            </svg>
          )}
          Lancer le traitement
        </button>
      )}

      {/* processed → lancer l'export */}
      {status === 'processed' && (
        <button
          onClick={() => startProcessing.mutate()}
          disabled={activeMutation}
          style={{
            fontSize: '12px', fontWeight: 500, padding: '5px 14px',
            borderRadius: 'var(--radius-md)',
            background: activeMutation ? 'var(--bg-3)' : 'var(--ac)',
            color: activeMutation ? 'var(--tx-2)' : 'var(--bg-1)',
            border: 'none', cursor: activeMutation ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          Lancer l'export
        </button>
      )}

      {/* failed → retry (remet en draft) */}
      {status === 'failed' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', color: 'var(--er)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="5" />
              <line x1="6" y1="3.5" x2="6" y2="7" />
              <circle cx="6" cy="8.8" r="0.6" fill="currentColor" />
            </svg>
            Pipeline en erreur
          </div>
          <button
            onClick={() => retry.mutate()}
            disabled={activeMutation}
            style={{
              fontSize: '11px', padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-2)', color: 'var(--tx-1)',
              border: '1px solid var(--border)', cursor: activeMutation ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1.5 5.5A4 4 0 019 2.5" />
              <path d="M7.5 1l1.5 1.5-1.5 1.5" />
              <path d="M9.5 5.5A4 4 0 012 8.5" />
              <path d="M3.5 10L2 8.5l1.5-1.5" />
            </svg>
            Réessayer
          </button>
        </>
      )}

      {/* Erreur mutation */}
      {error && (
        <span style={{ fontSize: '11px', color: 'var(--er)', marginLeft: '4px' }}>
          {error instanceof Error ? error.message : 'Erreur'}
        </span>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function SessionDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['sessions', id],
    queryFn:  () => sessionsApi.get(id!),
    enabled:  !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      const active = ['acquiring', 'acquired', 'processing', 'processed', 'exporting']
      return status && active.includes(status) ? 5_000 : false
    },
  })

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', { session_id: id }],
    queryFn:  () => assetsApi.list({ session_id: id }),
    enabled:  !!id,
    refetchInterval: session && ['processing', 'processed', 'exporting'].includes(session.status) ? 10_000 : false,
  })

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner label="Chargement de la session…" />
      </div>
    )
  }

  if (isError || !session) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--er-bd)" strokeWidth="1.5">
          <circle cx="16" cy="16" r="13" />
          <line x1="16" y1="10" x2="16" y2="18" />
          <circle cx="16" cy="22" r="1" fill="var(--er-bd)" />
        </svg>
        <span style={{ fontSize: '12px', color: 'var(--er)' }}>Session introuvable</span>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Breadcrumb session={session} />
      <ActionBar sessionId={String(session.id)} status={session.status} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ViewerPane  session={session} assets={assets} />
        <DetailPanel session={session} jobs={jobs} />
      </div>
    </div>
  )
}