import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { specimensApi } from '../../api/client'
import type { SpecimenRead } from '../../api/client'
import { Spinner, EmptyState, ErrorState } from '../../components/ui/Shared'
import { SpecimenTable }     from './components/SpecimenTable'
import { SpecimenFormModal } from './components/SpecimenFormModal'

export function SpecimensPage() {
  const queryClient = useQueryClient()

  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<SpecimenRead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SpecimenRead | null>(null)

  const { data: specimens = [], isLoading, isError } = useQuery({
    queryKey: ['specimens'],
    queryFn: () => specimensApi.list({ limit: 200 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => specimensApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['specimens'] })
      setDeleteTarget(null)
      setSelectedId(null)
    },
  })

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Modales */}
      {showCreate && (
        <SpecimenFormModal onClose={() => setShowCreate(false)} />
      )}
      {editTarget && (
        <SpecimenFormModal
          specimen={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Confirmation suppression */}
      {deleteTarget && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', padding: '24px',
            width: '380px', display: 'flex', flexDirection: 'column', gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tx-0)', marginBottom: '6px' }}>
                Supprimer ce spécimen ?
              </div>
              <div style={{ fontSize: '12px', color: 'var(--tx-1)' }}>
                <span style={{ fontWeight: 500 }}>
                  {deleteTarget.external_id ?? `Spécimen ${String(deleteTarget.id).slice(0, 8)}`}
                </span>
                {' '}sera définitivement supprimé. Cette action est irréversible.
              </div>
              {deleteMutation.isError && (
                <div style={{
                  marginTop: '10px', fontSize: '11px', color: 'var(--er)',
                  background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
                  borderRadius: 'var(--radius-md)', padding: '7px 10px',
                }}>
                  {deleteMutation.error instanceof Error
                    ? deleteMutation.error.message
                    : 'Ce spécimen est utilisé par des sessions existantes'}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setDeleteTarget(null); deleteMutation.reset() }}
                style={{
                  fontSize: '12px', padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  cursor: 'pointer', color: 'var(--tx-1)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(String(deleteTarget.id))}
                disabled={deleteMutation.isPending}
                style={{
                  fontSize: '12px', padding: '6px 16px', fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  background: deleteMutation.isPending ? 'var(--bg-3)' : 'var(--er)',
                  border: 'none', cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                  color: deleteMutation.isPending ? 'var(--tx-2)' : '#fff',
                }}
              >
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        padding: '10px 18px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--tx-0)' }}>
            Spécimens
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--tx-2)', marginTop: '2px',
            fontFamily: 'var(--font-mono)',
          }}>
            {isLoading
              ? 'Chargement…'
              : isError
              ? 'Erreur de chargement'
              : `${specimens.length} spécimen${specimens.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: 'var(--ac)', color: 'var(--bg-1)',
            fontSize: '12px', fontWeight: 500,
            padding: '5px 13px', borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"
            stroke="currentColor" strokeWidth="2">
            <line x1="5.5" y1="1"  x2="5.5" y2="10" />
            <line x1="1"   y1="5.5" x2="10" y2="5.5" />
          </svg>
          Nouveau spécimen
        </button>
      </div>

      {/* Corps */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner label="Chargement des spécimens…" />
          </div>
        )}
        {isError && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ErrorState message="Orchestrateur injoignable — lancer l'API sur localhost:8001" />
          </div>
        )}
        {!isLoading && !isError && specimens.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              message="Aucun spécimen — créez-en un pour pouvoir démarrer une session de scan"
              action={
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    fontSize: '11px', padding: '5px 14px',
                    background: 'var(--ac-bg)', color: 'var(--ac-tx)',
                    border: '1px solid var(--ac-bd)', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  Créer un spécimen
                </button>
              }
            />
          </div>
        )}
        {!isLoading && !isError && specimens.length > 0 && (
          <SpecimenTable
            specimens={specimens}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </div>
    </div>
  )
}