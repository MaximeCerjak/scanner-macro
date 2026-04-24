import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sessionsApi } from '../../api/client'
import { Spinner, EmptyState, ErrorState } from '../../components/ui/Shared'
import { FilterBar, matchesFilter } from './components/FilterBar'
import { SessionCard } from './components/SessionCard'
import { Inspector }   from './components/Inspector'
import { NewSessionModal } from '../../components/ui/NewSessionModal'
import type { StatusFilter } from './components/FilterBar'

export function SessionsPage() {
  const navigate = useNavigate()
  const [filter, setFilter]               = useState<StatusFilter>('all')
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)

  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list({ limit: 100 }),
    refetchInterval: 10_000,
  })

  const filtered = sessions.filter((s) => matchesFilter(s, filter))
  const selected = sessions.find((s) => String(s.id) === selectedId) ?? null

  function handleCardClick(id: string) {
    // Premier clic → sélectionner
    // Si déjà sélectionné → désélectionner (toggle)
    setSelectedId((prev) => prev === id ? null : id)
  }

  function handleCardDoubleClick(id: string) {
    // Double-clic → naviguer vers le détail
    navigate(`/sessions/${id}`)
  }

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onCreated={(id) => {
            setShowNewSession(false)
            navigate(`/sessions/${id}`)
          }}
        />
      )}

      {/* En-tête */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        padding: '10px 18px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--tx-0)' }}>
            Sessions de scan
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--tx-2)', marginTop: '2px',
            fontFamily: 'var(--font-mono)',
          }}>
            {isLoading
              ? 'Chargement…'
              : isError
              ? 'Erreur de chargement'
              : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FilterBar sessions={sessions} active={filter} onChange={setFilter} />
          <button
            onClick={() => setShowNewSession(true)}
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
            Nouvelle session
          </button>
        </div>
      </div>

      {/* Corps */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '14px', overflowY: 'auto', alignContent: 'start' }}>
          {isLoading && <Spinner label="Chargement des sessions…" />}
          {isError && (
            <ErrorState message="Orchestrateur injoignable — lancer l'API sur localhost:8001" />
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState
              message={
                filter === 'all'
                  ? 'Aucune session — cliquez sur « Nouvelle session » pour commencer'
                  : 'Aucune session dans ce filtre'
              }
            />
          )}
          {!isLoading && !isError && filtered.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
              gap: '9px',
            }}>
              {filtered.map((session) => (
                <SessionCard
                  key={String(session.id)}
                  session={session}
                  selected={selectedId === String(session.id)}
                  onSelect={() => handleCardClick(String(session.id))}
                  onDoubleClick={() => handleCardDoubleClick(String(session.id))}
                />
              ))}
            </div>
          )}
        </div>

        <Inspector
          session={selected}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </div>
  )
}