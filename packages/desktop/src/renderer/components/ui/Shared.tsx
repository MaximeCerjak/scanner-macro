import type { ReactNode } from 'react'

// ─── Statut ───────────────────────────────────────────────────────────────────

export function statusColors(status: string) {
  if (status === 'done' || status === 'success')
    return { bg: 'var(--ok-bg)', color: 'var(--ok)', border: 'var(--ok-bd)' }
  if (status === 'failed')
    return { bg: 'var(--er-bg)', color: 'var(--er)', border: 'var(--er-bd)' }
  if (['acquiring', 'acquired'].includes(status))
    return { bg: 'var(--ac-bg)', color: 'var(--ac-tx)', border: 'var(--ac-bd)' }
  if (['processing', 'processed', 'exporting', 'running', 'pending'].includes(status))
    return { bg: 'var(--info-bg)', color: 'var(--info)', border: 'var(--info-bd)' }
  if (status === 'cancelled')
    return { bg: 'var(--bg-3)', color: 'var(--tx-2)', border: 'var(--border)' }
  return { bg: 'var(--bg-2)', color: 'var(--tx-2)', border: 'var(--border)' }
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft', acquiring: 'Acquiring', acquired: 'Acquiring',
    processing: 'Traitement', processed: 'Traitement', exporting: 'Export',
    done: 'Terminé', failed: 'Échec', pending: 'En attente',
    running: 'En cours', success: 'Terminé', cancelled: 'Annulé',
  }
  return map[status] ?? status
}

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: string
  size?: 'sm' | 'md'
}) {
  const c = statusColors(status)
  return (
    <span style={{
      fontSize: size === 'sm' ? '10px' : '11px',
      fontWeight: 500,
      padding: size === 'sm' ? '2px 6px' : '3px 8px',
      borderRadius: 'var(--radius-sm)',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {statusLabel(status)}
    </span>
  )
}

// ─── MetaRow ──────────────────────────────────────────────────────────────────

export function MetaRow({
  label, value, mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: '8px',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--tx-2)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: '11px', color: 'var(--tx-0)',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        maxWidth: '150px', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, unit, color,
}: {
  label: string
  value: string
  unit?: string
  color?: string
}) {
  return (
    <div style={{
      background: 'var(--bg-2)', borderRadius: 'var(--radius-md)',
      padding: '8px 10px', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '16px', fontWeight: 500,
        fontFamily: 'var(--font-mono)',
        color: color ?? 'var(--tx-0)',
      }}>
        {value}
        {unit && (
          <span style={{ fontSize: '10px', color: 'var(--tx-2)', marginLeft: '2px' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({
  message, action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '10px', height: '200px',
    }}>
      <div style={{
        width: '44px', height: '44px',
        border: '1px dashed var(--border-2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
          stroke="var(--tx-2)" strokeWidth="1.5">
          <rect x="2" y="2" width="14" height="14" rx="2" />
          <line x1="9" y1="6" x2="9" y2="12" />
          <line x1="6" y1="9" x2="12" y2="9" />
        </svg>
      </div>
      <span style={{
        fontSize: '12px', color: 'var(--tx-2)',
        textAlign: 'center', maxWidth: '280px',
      }}>
        {message}
      </span>
      {action}
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '8px', height: '200px',
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
        stroke="var(--er)" strokeWidth="1.5">
        <circle cx="10" cy="10" r="8" />
        <line x1="10" y1="6" x2="10" y2="11" />
        <circle cx="10" cy="13.5" r="0.8" fill="var(--er)" />
      </svg>
      <span style={{ fontSize: '12px', color: 'var(--er)' }}>{message}</span>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '8px', color: 'var(--tx-2)', fontSize: '12px',
    }}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none" stroke="currentColor" strokeWidth="2"
        style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
      >
        <path d={`M${size / 2} 1a${size / 2 - 1} ${size / 2 - 1} 0 010 ${size - 2}`} />
      </svg>
      {label && <span>{label}</span>}
    </div>
  )
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', color: 'var(--tx-2)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: '8px', marginTop: '4px',
    }}>
      {children}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
}