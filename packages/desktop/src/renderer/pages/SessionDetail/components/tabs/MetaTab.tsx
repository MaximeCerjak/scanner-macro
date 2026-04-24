import type { SessionDetail } from '../../../../api/client'
import { statusLabel, MetaRow, StatCard } from '../../../../components/ui/Shared'

export function MetaTab({ session }: { session: SessionDetail }) {
  return (
    <div style={{ padding: '14px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
        <StatCard label="Statut" value={statusLabel(session.status)} />
        <StatCard
          label="Créée le"
          value={new Date(session.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short',
          })}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

      <div style={{
        fontSize: '10px', color: 'var(--tx-2)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: '8px',
      }}>
        Capture
      </div>

      <MetaRow label="Session ID" value={String(session.id).slice(0, 8) + '…'} mono />
      {session.name && <MetaRow label="Nom" value={session.name} />}
      {session.specimen_id && (
        <MetaRow label="Spécimen" value={String(session.specimen_id).slice(0, 8) + '…'} mono />
      )}
      {session.preset_id && (
        <MetaRow label="Preset" value={String(session.preset_id).slice(0, 8) + '…'} mono />
      )}
      {session.calibration_id && (
        <MetaRow label="Calibration" value={String(session.calibration_id).slice(0, 8) + '…'} mono />
      )}
    </div>
  )
}