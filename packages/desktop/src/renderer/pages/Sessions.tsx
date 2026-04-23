import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sessionsApi, specimensApi, presetsApi } from '../api/client'
import type { SessionRead } from '../api/client'
import { NewSessionModal } from '../components/ui/NewSessionModal'

// ─── Types locaux ─────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'acquiring' | 'processing' | 'done' | 'failed' | 'draft'

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft', acquiring: 'Acquiring', acquired: 'Acquiring',
    processing: 'Processing', processed: 'Processing',
    exporting: 'Processing', done: 'Done', failed: 'Échec',
  }
  return map[status] ?? status
}

function statusColors(status: string): { bg: string; color: string; border: string } {
  if (status === 'done')
    return { bg: 'var(--ok-bg)', color: 'var(--ok)', border: 'var(--ok-bd)' }
  if (status === 'failed')
    return { bg: 'var(--er-bg)', color: 'var(--er)', border: 'var(--er-bd)' }
  if (['acquiring', 'acquired'].includes(status))
    return { bg: 'var(--ac-bg)', color: 'var(--ac-tx)', border: 'var(--ac-bd)' }
  if (['processing', 'processed', 'exporting'].includes(status))
    return { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bd)' }
  return { bg: 'var(--bg-2)', color: 'var(--tx-2)', border: 'var(--border)' }
}

function matchesFilter(session: SessionRead, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'acquiring') return ['acquiring', 'acquired'].includes(session.status)
  if (filter === 'processing') return ['processing', 'processed', 'exporting'].includes(session.status)
  if (filter === 'done') return session.status === 'done'
  if (filter === 'failed') return session.status === 'failed'
  if (filter === 'draft') return session.status === 'draft'
  return true
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = statusColors(status)
  return (
    <span style={{
      fontSize: '10px', fontWeight: 500,
      padding: '2px 6px', borderRadius: 'var(--radius-sm)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {statusLabel(status)}
    </span>
  )
}

function CrosshairThumb({ selected }: { selected: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none"
      stroke={selected ? 'var(--ac)' : 'var(--border-2)'} strokeWidth="1.2"
      style={{ opacity: selected ? 0.6 : 0.25, transition: 'all 0.15s' }}
    >
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="7" />
      <circle cx="24" cy="24" r="1.5" fill={selected ? 'var(--ac)' : 'var(--border-2)'} stroke="none" />
      <line x1="24" y1="4" x2="24" y2="15" />
      <line x1="24" y1="33" x2="24" y2="44" />
      <line x1="4" y1="24" x2="15" y2="24" />
      <line x1="33" y1="24" x2="44" y2="24" />
    </svg>
  )
}

function SessionCard({
  session, selected, onSelect, onDoubleClick,
}: {
  session: SessionRead
  selected: boolean
  onSelect: () => void
  onDoubleClick: () => void
}) {
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      style={{
        background: 'var(--bg-1)',
        border: selected ? '1.5px solid var(--ac)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'border-color 0.1s',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: '88px',
        background: 'var(--bg-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <CrosshairThumb selected={selected} />
      </div>

      {/* Infos */}
      <div style={{ padding: '9px 10px 10px' }}>
        <div style={{
          fontSize: '12px', fontWeight: 500, color: 'var(--tx-0)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>
          {session.name ?? `Session ${session.id.slice(0, 8)}`}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginBottom: '7px' }}>
          {formatDate(session.created_at)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusBadge status={session.status} />
        </div>
      </div>
    </div>
  )
}

function FilterPill({
  label, active, count, onClick,
}: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: '11px',
        padding: '4px 10px',
        borderRadius: 'var(--radius-md)',
        border: active ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
        background: active ? 'var(--ac-bg)' : 'var(--bg-2)',
        color: active ? 'var(--ac-tx)' : 'var(--tx-1)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '5px',
        transition: 'all 0.1s',
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: '10px',
          background: active ? 'var(--ac)' : 'var(--bg-3)',
          color: active ? 'var(--bg-1)' : 'var(--tx-2)',
          borderRadius: '10px',
          padding: '0 5px',
          minWidth: '16px',
          textAlign: 'center',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Panneau inspecteur ───────────────────────────────────────────────────────

function Inspector({ session }: { session: SessionRead | null }) {
  const navigate = useNavigate()

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

  return (
    <div style={{
      width: '240px', flexShrink: 0,
      background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* En-tête inspecteur */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
          Détail
        </div>
        {/* Preview crosshair */}
        <div style={{
          background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)',
          height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)', marginBottom: '12px',
        }}>
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none"
            stroke="var(--ac)" strokeWidth="1.2" style={{ opacity: 0.5 }}>
            <circle cx="24" cy="24" r="18" />
            <circle cx="24" cy="24" r="10" />
            <circle cx="24" cy="24" r="3" />
            <circle cx="24" cy="24" r="1" fill="var(--ac)" stroke="none" />
            <line x1="24" y1="4" x2="24" y2="12" />
            <line x1="24" y1="36" x2="24" y2="44" />
            <line x1="4" y1="24" x2="12" y2="24" />
            <line x1="36" y1="24" x2="44" y2="24" />
          </svg>
        </div>

        <StatusBadge status={session.status} />
      </div>

      {/* Métadonnées */}
      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
        <MetaRow label="Nom" value={session.name ?? `Session ${session.id.slice(0, 8)}`} />
        <MetaRow label="Créée le" value={formatDate(session.created_at)} />
        <MetaRow label="ID" value={session.id.slice(0, 8) + '…'} mono />

        {session.preset_id && (
          <MetaRow label="Preset" value={session.preset_id.slice(0, 8) + '…'} mono />
        )}
        {session.specimen_id && (
          <MetaRow label="Spécimen" value={session.specimen_id.slice(0, 8) + '…'} mono />
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: '7px',
      }}>
        <button
          onClick={() => navigate(`/sessions/${session.id}`)}
          style={{
            flex: 1, fontSize: '11px', padding: '6px 0',
            borderRadius: 'var(--radius-md)',
            background: 'var(--ac-bg)', color: 'var(--ac-tx)',
            border: '1px solid var(--ac-bd)', cursor: 'pointer',
          }}
        >
          Voir détail
        </button>
        <button
          style={{
            flex: 1, fontSize: '11px', padding: '6px 0',
            borderRadius: 'var(--radius-md)',
            background: 'var(--ac)', color: 'var(--bg-1)',
            border: 'none', cursor: 'pointer', fontWeight: 500,
          }}
        >
          Exporter
        </button>
      </div>
    </div>
  )
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>{label}</span>
      <span style={{
        fontSize: '11px', color: 'var(--tx-0)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',        label: 'Toutes'     },
  { key: 'acquiring',  label: 'En cours'   },
  { key: 'processing', label: 'Traitement' },
  { key: 'done',       label: 'Terminées'  },
  { key: 'failed',     label: 'Échecs'     },
  { key: 'draft',      label: 'Brouillons' },
]

export function SessionsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)

  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list({ limit: 100 }),
    refetchInterval: 10_000, // Refresh toutes les 10s en complément du WS
  })

  const filtered = sessions.filter((s) => matchesFilter(s, filter))
  const selected = sessions.find((s) => s.id === selectedId) ?? null

  // Compteurs pour les filtres
  const counts: Record<StatusFilter, number> = {
    all:        sessions.length,
    acquiring:  sessions.filter((s) => matchesFilter(s, 'acquiring')).length,
    processing: sessions.filter((s) => matchesFilter(s, 'processing')).length,
    done:       sessions.filter((s) => matchesFilter(s, 'done')).length,
    failed:     sessions.filter((s) => matchesFilter(s, 'failed')).length,
    draft:      sessions.filter((s) => matchesFilter(s, 'draft')).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* En-tête page */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        padding: '10px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
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
              : `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`
            }
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {FILTERS.map(({ key, label }) => (
              <FilterPill
                key={key}
                label={label}
                active={filter === key}
                count={key !== 'all' && counts[key] > 0 ? counts[key] : undefined}
                onClick={() => setFilter(key)}
              />
            ))}
          </div>

          {/* Bouton nouvelle session */}
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
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5.5" y1="1" x2="5.5" y2="10" />
              <line x1="1" y1="5.5" x2="10" y2="5.5" />
            </svg>
            Nouvelle session
          </button>
        </div>
      </div>

      {/* Corps — grille + inspecteur */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Grille */}
        <div style={{
          flex: 1,
          padding: '14px',
          overflowY: 'auto',
          alignContent: 'start',
        }}>
          {isLoading && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '200px', color: 'var(--tx-2)', fontSize: '12px',
            }}>
              Chargement des sessions…
            </div>
          )}

          {isError && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '8px',
              height: '200px', color: 'var(--er)', fontSize: '12px',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="10" cy="10" r="8" />
                <line x1="10" y1="6" x2="10" y2="11" />
                <circle cx="10" cy="13.5" r="0.8" fill="currentColor" />
              </svg>
              Orchestrateur injoignable — lancer l'API sur localhost:8001
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '10px',
              height: '200px',
            }}>
              <div style={{
                width: '44px', height: '44px',
                border: '1px dashed var(--border-2)', borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--tx-2)" strokeWidth="1.5">
                  <rect x="2" y="2" width="14" height="14" rx="2" />
                  <line x1="9" y1="6" x2="9" y2="12" />
                  <line x1="6" y1="9" x2="12" y2="9" />
                </svg>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--tx-2)' }}>
                {filter === 'all'
                  ? 'Aucune session — cliquez sur « Nouvelle session » pour commencer'
                  : `Aucune session dans ce filtre`}
              </span>
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
              gap: '9px',
            }}>
              {filtered.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  selected={selectedId === session.id}
                  onSelect={() => setSelectedId(session.id)}
                  onDoubleClick={() => navigate(`/sessions/${session.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Inspecteur */}
        <Inspector session={selected} />
      </div>

      {showNewSession && (
        <NewSessionModal
            onClose={() => setShowNewSession(false)}
            onCreated={(id) => {
            setShowNewSession(false)
            // navigate(`/sessions/${id}`)  // décommenter quand SessionDetail est prête
            }}
        />
        )}
    </div>
  )
}