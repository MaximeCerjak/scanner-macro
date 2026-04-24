import { useQuery } from '@tanstack/react-query'
import type { SessionDetail } from '../../../../api/client'
import { presetsApi, specimensApi } from '../../../../api/client'
import { statusLabel, MetaRow, StatCard, Divider, SectionTitle } from '../../../../components/ui/Shared'

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDuration(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (ms < 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

export function MetaTab({ session }: { session: SessionDetail }) {
  // Résolution preset → nom lisible
  const { data: preset } = useQuery({
    queryKey: ['presets', session.preset_id],
    queryFn: () => presetsApi.get(String(session.preset_id)),
    enabled: !!session.preset_id,
    staleTime: 5 * 60_000, // les presets changent peu
  })

  // Résolution specimen → nom lisible
  const { data: specimen } = useQuery({
    queryKey: ['specimens', session.specimen_id],
    queryFn: () => specimensApi.get(String(session.specimen_id)),
    enabled: !!session.specimen_id,
    staleTime: 5 * 60_000,
  })

  // Durée totale session (updated_at - created_at si terminée)
  const isFinished = ['done', 'failed'].includes(session.status)
  const sessionDuration = isFinished
    ? formatDuration(session.created_at, session.updated_at)
    : null

  return (
    <div style={{ padding: '14px', overflowY: 'auto', flex: 1 }}>
      {/* Stats résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
        <StatCard
          label="Statut"
          value={statusLabel(session.status)}
          color={
            session.status === 'done' ? 'var(--ok)'
            : session.status === 'failed' ? 'var(--er)'
            : undefined
          }
        />
        <StatCard
          label={isFinished ? 'Durée totale' : 'Créée le'}
          value={
            isFinished && sessionDuration
              ? sessionDuration
              : formatDateShort(session.created_at)
          }
        />
      </div>

      <Divider />

      {/* Spécimen */}
      <SectionTitle>Spécimen</SectionTitle>
      <MetaRow
        label="Nom"
        value={specimen?.name ?? specimen?.external_id ?? `…${String(session.specimen_id).slice(-6)}`}
      />
      {specimen?.category && (
        <MetaRow label="Catégorie" value={specimen.category} />
      )}
      {specimen?.size_mm != null && (
        <MetaRow label="Taille" value={`${specimen.size_mm} mm`} mono />
      )}
      {specimen?.pin_status && (
        <MetaRow label="Montage" value={specimen.pin_status} />
      )}

      <Divider />

      {/* Preset */}
      <SectionTitle>Preset</SectionTitle>
      <MetaRow
        label="Nom"
        value={preset?.name ?? `…${String(session.preset_id).slice(-6)}`}
      />
      {preset && (
        <>
          <MetaRow label="Anneaux" value={String(preset.rings)} mono />
          <MetaRow label="Pas angulaire" value={`${preset.angular_step_deg}°`} mono />
          <MetaRow label="Plans focus" value={String(preset.focus_planes)} mono />
          <MetaRow label="Stacking" value={preset.stack_mode} />
        </>
      )}

      <Divider />

      {/* Session */}
      <SectionTitle>Session</SectionTitle>
      <MetaRow label="ID" value={String(session.id).slice(0, 8) + '…'} mono />
      {session.name && <MetaRow label="Nom" value={session.name} />}
      {session.operator && <MetaRow label="Opérateur" value={session.operator} />}
      <MetaRow label="Créée le" value={formatDateLong(session.created_at)} />
      <MetaRow label="Mise à jour" value={formatDateLong(session.updated_at)} />
      {session.calibration_id && (
        <MetaRow label="Calibration" value={String(session.calibration_id).slice(0, 8) + '…'} mono />
      )}
      {session.manifest_key && (
        <MetaRow label="Manifeste" value="✓ Disponible" />
      )}
    </div>
  )
}