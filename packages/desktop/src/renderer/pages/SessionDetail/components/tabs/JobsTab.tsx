import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { JobRead } from '../../../../api/client'
import { jobsApi } from '../../../../api/client'
import { statusColors, statusLabel } from '../../../../components/ui/Shared'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

const JOB_TYPE_LABELS: Record<string, string> = {
  transfer:        'Transfert fichiers',
  stacking:        'Focus stacking',
  photogrammetry:  'COLMAP / Reconstruction sparse',
  post_processing: 'OpenMVS + Mesh',
  export:          'Export GLB / LOD',
  qa:              'Contrôle qualité',
}

const ACTIVE_STATUSES = ['pending', 'running', 'retrying']
const CANCELLABLE_STATUSES = ['pending', 'running', 'retrying']

/** Progression pseudo-réelle pour l'UX — on n'a pas de vrai % */
function jobProgress(job: JobRead): { pct: number; color: string; animated: boolean } {
  switch (job.status) {
    case 'success':  return { pct: 100, color: 'var(--ok)',   animated: false }
    case 'failed':   return { pct: 100, color: 'var(--er)',   animated: false }
    case 'running':  return { pct: 60,  color: 'var(--info)', animated: true  }
    case 'retrying': return { pct: 30,  color: 'var(--wn)',   animated: true  }
    case 'pending':  return { pct: 10,  color: 'var(--info)', animated: true  }
    case 'cancelled':return { pct: 0,   color: 'var(--tx-2)', animated: false }
    default:         return { pct: 0,   color: 'var(--bg-3)', animated: false }
  }
}

// ─── Composant JobRow ─────────────────────────────────────────────────────────

function JobRow({ job, sessionId }: { job: JobRead; sessionId: string }) {
  const queryClient = useQueryClient()
  const [showLog, setShowLog] = useState(false)

  const cancelMutation = useMutation({
    mutationFn: () => jobsApi.cancel(String(job.id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] })
    },
  })

  const { pct, color, animated } = jobProgress(job)
  const c = statusColors(job.status)
  const isCancellable = CANCELLABLE_STATUSES.includes(job.status)
  const hasError = !!job.error_log

  return (
    <div style={{
      background: 'var(--bg-2)', borderRadius: 'var(--radius-md)',
      border: `1px solid ${hasError && !showLog ? 'var(--er-bd)' : 'var(--border)'}`,
      marginBottom: '6px', overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ padding: '8px 10px' }}>
        {/* En-tête ligne */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx-0)' }}>
            {JOB_TYPE_LABELS[job.type] ?? job.type}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
              {formatDuration(job.duration_s)}
            </span>
            {/* Bouton cancel */}
            {isCancellable && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                title="Annuler ce job"
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                  padding: '2px 5px', color: 'var(--tx-2)',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  fontSize: '10px', opacity: cancelMutation.isPending ? 0.5 : 1,
                }}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <line x1="1.5" y1="1.5" x2="7.5" y2="7.5" />
                  <line x1="7.5" y1="1.5" x2="1.5" y2="7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', marginBottom: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            width: `${pct}%`, background: color,
            transition: animated ? 'none' : 'width 0.3s ease',
            animation: animated ? 'progressPulse 1.5s ease-in-out infinite' : 'none',
          }} />
        </div>

        {/* Status + heure + tentative */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '10px', fontWeight: 500, padding: '1px 5px', borderRadius: '3px',
              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            }}>
              {statusLabel(job.status)}
            </span>
            {job.attempt > 1 && (
              <span style={{
                fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                background: 'var(--wn-bg)', color: 'var(--wn)', border: '1px solid var(--wn-bd)',
              }}>
                Tentative {job.attempt}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {job.started_at && (
              <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
                {new Date(job.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            {/* Bouton log erreur */}
            {hasError && (
              <button
                onClick={() => setShowLog((v) => !v)}
                style={{
                  background: showLog ? 'var(--er-bg)' : 'none',
                  border: `1px solid ${showLog ? 'var(--er-bd)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  padding: '2px 6px', color: showLog ? 'var(--er)' : 'var(--tx-2)',
                  fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px',
                  transition: 'all 0.1s',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 2h7M1 4.5h5M1 7h3" />
                </svg>
                Log
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log erreur — expandable */}
      {showLog && job.error_log && (
        <div style={{
          borderTop: '1px solid var(--er-bd)',
          background: 'var(--er-bg)',
          padding: '8px 10px',
          maxHeight: '120px',
          overflowY: 'auto',
        }}>
          <pre style={{
            fontSize: '10px', color: 'var(--er)',
            fontFamily: 'var(--font-mono)', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            lineHeight: 1.5,
          }}>
            {job.error_log}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── JobsTab ──────────────────────────────────────────────────────────────────

export function JobsTab({ jobs, sessionId }: { jobs: JobRead[]; sessionId: string }) {
  if (jobs.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--tx-2)', fontSize: '11px', padding: '20px',
        textAlign: 'center',
      }}>
        Aucun job — le pipeline démarre après l'acquisition
      </div>
    )
  }

  const active  = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length
  const failed  = jobs.filter((j) => j.status === 'failed').length
  const success = jobs.filter((j) => j.status === 'success').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Résumé compact */}
      {jobs.length > 0 && (
        <div style={{
          padding: '8px 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)', flexShrink: 0,
          display: 'flex', gap: '12px',
        }}>
          {[
            { label: 'Total', value: jobs.length, color: 'var(--tx-1)' },
            { label: 'OK',    value: success, color: 'var(--ok)'   },
            { label: 'Actif', value: active,  color: 'var(--info)' },
            { label: 'Erreur',value: failed,  color: 'var(--er)'   },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 500, color }}>
                {value}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {jobs.map((job) => (
          <JobRow key={String(job.id)} job={job} sessionId={sessionId} />
        ))}
      </div>
    </div>
  )
}