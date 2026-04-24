import type { SessionRead } from '../../../api/client'
import { StatusBadge } from '../../../components/ui/Shared'
import { BASE_URL } from '../../../api/client'

// ─── Thumbnail / fallback ─────────────────────────────────────────────────────

function CrosshairThumb({ selected }: { selected: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none"
      stroke={selected ? 'var(--ac)' : 'var(--border-2)'}
      strokeWidth="1.2"
      style={{ opacity: selected ? 0.6 : 0.25, transition: 'all 0.15s' }}
    >
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="7" />
      <circle cx="24" cy="24" r="1.5"
        fill={selected ? 'var(--ac)' : 'var(--border-2)'} stroke="none" />
      <line x1="24" y1="4"  x2="24" y2="15" />
      <line x1="24" y1="33" x2="24" y2="44" />
      <line x1="4"  y1="24" x2="15" y2="24" />
      <line x1="33" y1="24" x2="44" y2="24" />
    </svg>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

interface SessionCardProps {
  session: SessionRead
  selected: boolean
  onSelect: () => void
  onDoubleClick: () => void
}

export function SessionCard({ session, selected, onSelect, onDoubleClick }: SessionCardProps) {
  const thumbnailUrl = session.thumbnail_key
    ? `${BASE_URL}/sessions/${session.id}/thumbnail`
    : null

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
        height: '88px', background: 'var(--bg-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={session.name ?? 'Session'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              // Fallback si l'image ne charge pas
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.removeAttribute('hidden')
            }}
          />
        ) : null}
        <div hidden={!!thumbnailUrl}>
          <CrosshairThumb selected={selected} />
        </div>
      </div>

      {/* Infos */}
      <div style={{ padding: '9px 10px 10px' }}>
        <div style={{
          fontSize: '12px', fontWeight: 500, color: 'var(--tx-0)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>
          {session.name ?? `Session ${String(session.id).slice(0, 8)}`}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginBottom: '7px' }}>
          {formatDate(session.created_at)}
        </div>
        <StatusBadge status={session.status} size="sm" />
      </div>
    </div>
  )
}