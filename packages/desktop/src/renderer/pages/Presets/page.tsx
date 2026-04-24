import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { presetsApi } from '../../api/client'
import type { PresetRead } from '../../api/client'
import { Spinner, EmptyState, ErrorState } from '../../components/ui/Shared'
import { PresetCard }       from './components/PresetCard'
import { PresetInspector }  from './components/PresetInspector'
import { PresetFormModal }  from './components/PresetFormModal'
import { DuplicateModal }   from './components/DuplicateModal'

// ─── Filtre ───────────────────────────────────────────────────────────────────

type PresetFilter = 'all' | 'system' | 'custom'

const FILTERS: { key: PresetFilter; label: string }[] = [
  { key: 'all',    label: 'Tous'     },
  { key: 'system', label: 'Système'  },
  { key: 'custom', label: 'Personnalisés' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PresetsPage() {
  const [filter,        setFilter]        = useState<PresetFilter>('all')
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [showCreate,    setShowCreate]    = useState(false)
  const [editTarget,    setEditTarget]    = useState<PresetRead | null>(null)
  const [dupTarget,     setDupTarget]     = useState<PresetRead | null>(null)

  const { data: presets = [], isLoading, isError } = useQuery({
    queryKey: ['presets'],
    queryFn:  () => presetsApi.list(),
  })

  const filtered = presets.filter((p) => {
    if (filter === 'system') return p.is_system
    if (filter === 'custom') return !p.is_system
    return true
  })

  const selected = presets.find((p) => String(p.id) === selectedId) ?? null

  function handleCardClick(id: string) {
    setSelectedId((prev) => prev === id ? null : id)
  }

  function handleCardDoubleClick(preset: PresetRead) {
    // Double-clic : ouvre l'édition si custom, la lecture si système
    if (preset.is_system) {
      setEditTarget(preset)  // modal en lecture seule pour les systèmes
    } else {
      setEditTarget(preset)
    }
  }

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Modales */}
      {showCreate && (
        <PresetFormModal onClose={() => setShowCreate(false)} />
      )}
      {editTarget && (
        <PresetFormModal
          preset={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {dupTarget && (
        <DuplicateModal
          preset={dupTarget}
          onClose={() => setDupTarget(null)}
          onCreated={(newId) => {
            setDupTarget(null)
            setSelectedId(newId)
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
            Presets de capture
          </div>
          <div style={{ fontSize: '11px', color: 'var(--tx-2)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {isLoading
              ? 'Chargement…'
              : isError
              ? 'Erreur de chargement'
              : `${presets.length} preset${presets.length !== 1 ? 's' : ''} · ${presets.filter((p) => !p.is_system).length} personnalisé${presets.filter((p) => !p.is_system).length !== 1 ? 's' : ''}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {FILTERS.map(({ key, label }) => {
              const isActive = filter === key
              const count = key === 'all'
                ? undefined
                : presets.filter((p) => key === 'system' ? p.is_system : !p.is_system).length
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    fontSize: '11px', padding: '4px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
                    background: isActive ? 'var(--ac-bg)' : 'var(--bg-2)',
                    color: isActive ? 'var(--ac-tx)' : 'var(--tx-1)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.1s',
                  }}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span style={{
                      fontSize: '10px',
                      background: isActive ? 'var(--ac)' : 'var(--bg-3)',
                      color: isActive ? 'var(--bg-1)' : 'var(--tx-2)',
                      borderRadius: '10px', padding: '0 5px',
                      minWidth: '16px', textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Nouveau preset */}
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
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5.5" y1="1"  x2="5.5" y2="10" />
              <line x1="1"   y1="5.5" x2="10" y2="5.5" />
            </svg>
            Nouveau preset
          </button>
        </div>
      </div>

      {/* Corps */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Grille */}
        <div style={{ flex: 1, padding: '14px', overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <Spinner label="Chargement des presets…" />
            </div>
          )}
          {isError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <ErrorState message="Orchestrateur injoignable — lancer l'API sur localhost:8001" />
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState
              message={
                filter === 'custom'
                  ? 'Aucun preset personnalisé — créez-en un ou dupliquez un preset système'
                  : 'Aucun preset'
              }
              action={
                filter !== 'system' ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    style={{
                      fontSize: '11px', padding: '5px 14px',
                      background: 'var(--ac-bg)', color: 'var(--ac-tx)',
                      border: '1px solid var(--ac-bd)', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                    }}
                  >
                    Créer un preset
                  </button>
                ) : undefined
              }
            />
          )}
          {!isLoading && !isError && filtered.length > 0 && (
            <>
              {/* Presets système en tête si filtre = all */}
              {filter === 'all' && (
                <>
                  {presets.some((p) => p.is_system) && (
                    <div style={{
                      fontSize: '10px', color: 'var(--tx-2)',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      marginBottom: '10px',
                    }}>
                      Presets système
                    </div>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '9px',
                    marginBottom: presets.some((p) => !p.is_system) ? '20px' : '0',
                  }}>
                    {presets.filter((p) => p.is_system).map((preset) => (
                      <PresetCard
                        key={String(preset.id)}
                        preset={preset}
                        selected={selectedId === String(preset.id)}
                        onSelect={() => handleCardClick(String(preset.id))}
                        onDoubleClick={() => handleCardDoubleClick(preset)}
                      />
                    ))}
                  </div>

                  {presets.some((p) => !p.is_system) && (
                    <div style={{
                      fontSize: '10px', color: 'var(--tx-2)',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      marginBottom: '10px',
                    }}>
                      Presets personnalisés
                    </div>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '9px',
                  }}>
                    {presets.filter((p) => !p.is_system).map((preset) => (
                      <PresetCard
                        key={String(preset.id)}
                        preset={preset}
                        selected={selectedId === String(preset.id)}
                        onSelect={() => handleCardClick(String(preset.id))}
                        onDoubleClick={() => handleCardDoubleClick(preset)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Filtre unique — grille simple */}
              {filter !== 'all' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '9px',
                }}>
                  {filtered.map((preset) => (
                    <PresetCard
                      key={String(preset.id)}
                      preset={preset}
                      selected={selectedId === String(preset.id)}
                      onSelect={() => handleCardClick(String(preset.id))}
                      onDoubleClick={() => handleCardDoubleClick(preset)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Panneau latéral */}
        <PresetInspector
          preset={selected}
          onEdit={setEditTarget}
          onDuplicate={setDupTarget}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </div>
  )
}