import type { SessionRead } from '../../../api/client'

export type StatusFilter = 'all' | 'acquiring' | 'processing' | 'done' | 'failed' | 'draft'

export const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',        label: 'Toutes'     },
  { key: 'acquiring',  label: 'En cours'   },
  { key: 'processing', label: 'Traitement' },
  { key: 'done',       label: 'Terminées'  },
  { key: 'failed',     label: 'Échecs'     },
  { key: 'draft',      label: 'Brouillons' },
]

export function matchesFilter(session: SessionRead, filter: StatusFilter): boolean {
  if (filter === 'all')        return true
  if (filter === 'acquiring')  return ['acquiring', 'acquired'].includes(session.status)
  if (filter === 'processing') return ['processing', 'processed', 'exporting'].includes(session.status)
  if (filter === 'done')       return session.status === 'done'
  if (filter === 'failed')     return session.status === 'failed'
  if (filter === 'draft')      return session.status === 'draft'
  return true
}

interface FilterBarProps {
  sessions: SessionRead[]
  active: StatusFilter
  onChange: (f: StatusFilter) => void
}

export function FilterBar({ sessions, active, onChange }: FilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {FILTERS.map(({ key, label }) => {
        const count = key === 'all'
          ? undefined
          : sessions.filter((s) => matchesFilter(s, key)).length
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
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
  )
}