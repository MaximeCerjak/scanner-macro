import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SessionRead } from '../../../api/client'
import { sessionsApi } from '../../../api/client'
import { StatusBadge, MetaRow } from '../../../components/ui/Shared'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

interface InspectorProps {
  session: SessionRead | null
  onDeleted?: () => void
}

export function Inspector({ session, onDeleted }: InspectorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.delete(id),
    onMutate: async (id) => {
        // Annuler les refetch en cours pour éviter qu'ils écrasent la mise à jour optimiste
        await queryClient.cancelQueries({ queryKey: ['sessions'] })
        // Retirer immédiatement la session du cache
        queryClient.setQueryData<SessionRead[]>(['sessions'], (old) =>
        old ? old.filter((s) => String(s.id) !== id) : []
        )
    },
    onSuccess: () => {
        setConfirming(false)
        onDeleted?.()
    },
    onError: () => {
        // En cas d'erreur, invalider pour remettre l'état correct depuis le serveur
        void queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  if (!session) {
    return (
      <div style={{
        width: '240px', flexShrink: 0,
        background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>
          Sélectionner une session
        </span>
      </div>
    )
  }

  const canDelete = !session.is_closed &&
    !['acquiring', 'processing', 'exporting'].includes(session.status)

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* En-tête */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          fontSize: '10px', color: 'var(--tx-2)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: '8px',
        }}>
          Détail
        </div>

        <div style={{
          background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)',
          height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)', marginBottom: '10px',
        }}>
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none"
            stroke="var(--ac)" strokeWidth="1.2" style={{ opacity: 0.5 }}>
            <circle cx="24" cy="24" r="18" />
            <circle cx="24" cy="24" r="10" />
            <circle cx="24" cy="24" r="3" />
            <circle cx="24" cy="24" r="1" fill="var(--ac)" stroke="none" />
            <line x1="24" y1="4"  x2="24" y2="12" />
            <line x1="24" y1="36" x2="24" y2="44" />
            <line x1="4"  y1="24" x2="12" y2="24" />
            <line x1="36" y1="24" x2="44" y2="24" />
          </svg>
        </div>

        <StatusBadge status={session.status} />
      </div>

      {/* Métadonnées */}
      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
        <MetaRow
          label="Nom"
          value={session.name ?? `Session ${String(session.id).slice(0, 8)}`}
        />
        <MetaRow label="Créée le" value={formatDate(session.created_at)} />
        <MetaRow label="ID" value={String(session.id).slice(0, 8) + '…'} mono />
        {session.preset_id && (
          <MetaRow label="Preset" value={String(session.preset_id).slice(0, 8) + '…'} mono />
        )}
        {session.specimen_id && (
          <MetaRow label="Spécimen" value={String(session.specimen_id).slice(0, 8) + '…'} mono />
        )}
      </div>

      {/* Confirmation suppression */}
      {confirming && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--er-bd)',
          background: 'var(--er-bg)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--er)', marginBottom: '8px' }}>
            Supprimer cette session ?
          </div>
          {deleteMutation.isError && (
            <div style={{ fontSize: '10px', color: 'var(--er)', marginBottom: '6px' }}>
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Erreur lors de la suppression'}
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => { setConfirming(false); deleteMutation.reset() }}
              style={{
                flex: 1, fontSize: '11px', padding: '5px 0',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--tx-1)',
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => deleteMutation.mutate(String(session.id))}
              disabled={deleteMutation.isPending}
              style={{
                flex: 1, fontSize: '11px', padding: '5px 0', fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                background: deleteMutation.isPending ? 'var(--bg-3)' : 'var(--er)',
                border: 'none',
                cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                color: deleteMutation.isPending ? 'var(--tx-2)' : '#fff',
              }}
            >
              {deleteMutation.isPending ? '…' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!confirming && (
        <div style={{
          padding: '10px 12px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: '6px', flexWrap: 'wrap',
        }}>
          <button
            onClick={() => navigate(`/sessions/${String(session.id)}`)}
            style={{
              flex: 1, fontSize: '11px', padding: '6px 0',
              borderRadius: 'var(--radius-md)',
              background: 'var(--ac-bg)', color: 'var(--ac-tx)',
              border: '1px solid var(--ac-bd)', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Voir détail
          </button>
          <button
            style={{
              flex: 1, fontSize: '11px', padding: '6px 0', fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              background: 'var(--ac)', color: 'var(--bg-1)',
              border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Exporter
          </button>
          {canDelete && (
            <button
              onClick={() => setConfirming(true)}
              title="Supprimer la session"
              style={{
                width: '30px', fontSize: '11px', padding: '6px 0',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-2)', color: 'var(--tx-2)',
                border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                stroke="currentColor" strokeWidth="1.5">
                <polyline points="2,3 10,3" />
                <path d="M4 3V2h4v1" />
                <path d="M3 3l.5 7h5L9 3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}