import type { JobRead } from '../../../../api/client'
import { statusColors, statusLabel } from '../../../../components/ui/Shared'

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function jobTypeLabel(type: string): string {
  const map: Record<string, string> = {
    transfer:        'Transfert fichiers',
    stacking:        'Focus stacking',
    photogrammetry:  'COLMAP sparse',
    post_processing: 'OpenMVS + mesh',
    export:          'Export LOD/GLB',
    qa:              'Contrôle qualité',
  }
  return map[type] ?? type
}

export function JobsTab({ jobs }: { jobs: JobRead[] }) {
  if (jobs.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--tx-2)', fontSize: '11px',
      }}>
        Aucun job — pipeline non démarré
      </div>
    )
  }

  return (
    <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
      {jobs.map((job) => {
        const c = statusColors(job.status)
        const pct =
          job.status === 'success' ? 100
          : job.status === 'running' ? 60
          : job.status === 'failed'  ? 100
          : 0
        const barColor =
          job.status === 'failed' ? 'var(--er)'
          : job.status === 'running' || job.status === 'pending' ? 'var(--info)'
          : 'var(--ok)'

        return (
          <div key={String(job.id)} style={{
            background: 'var(--bg-2)', borderRadius: 'var(--radius-md)',
            padding: '8px 10px', marginBottom: '5px',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '5px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx-0)' }}>
                {jobTypeLabel(job.type)}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
                {formatDuration(job.duration_s)}
              </span>
            </div>

            <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', marginBottom: '5px' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: `${pct}%`, background: barColor,
                transition: 'width 0.3s ease',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '10px', fontWeight: 500,
                padding: '1px 5px', borderRadius: '3px',
                background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              }}>
                {statusLabel(job.status)}
              </span>
              {job.started_at && (
                <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(job.started_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}