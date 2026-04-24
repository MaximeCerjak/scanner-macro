import { useNavigate } from 'react-router-dom'
import type { SessionDetail } from '../../../api/client'
import { StatusBadge } from '../../../components/ui/Shared'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function Breadcrumb({ session }: { session: SessionDetail }) {
  const navigate = useNavigate()
  return (
    <div style={{
      background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
      padding: '0 18px', height: '34px',
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '11px', flexShrink: 0,
    }}>
      <button
        onClick={() => navigate('/sessions')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--ac)', fontSize: '11px', padding: 0,
        }}
      >
        Sessions
      </button>
      <span style={{ color: 'var(--tx-2)' }}>/</span>
      <span style={{ color: 'var(--tx-1)', fontFamily: 'var(--font-mono)' }}>
        {session.name ?? `SES-${String(session.id).slice(0, 8)}`}
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <StatusBadge status={session.status} />
        <span style={{ fontSize: '11px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
          {formatDate(session.created_at)}
        </span>
      </div>
    </div>
  )
}