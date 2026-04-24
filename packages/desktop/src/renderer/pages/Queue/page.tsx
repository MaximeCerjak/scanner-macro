import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi, jobsApi } from '../../api/client'
import type { SessionRead, JobRead } from '../../api/client'
import { statusColors, statusLabel, Spinner, ErrorState } from '../../components/ui/Shared'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode   = 'sessions' | 'timeline'
type JobFilter  = 'active' | 'all' | 'failed'

const ACTIVE_STATUSES  = ['pending', 'running', 'retrying']
const FAILED_STATUSES  = ['failed']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  transfer:        'Transfert',
  stacking:        'Focus stacking',
  photogrammetry:  'Reconstruction sparse',
  post_processing: 'Mesh + textures',
  export:          'Export GLB',
  qa:              'Contrôle QA',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(s: number | null | undefined): string {
  if (s == null) return '—'
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60); const r = Math.round(s % 60)
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

function jobProgress(status: string): { pct: number; color: string; pulse: boolean } {
  switch (status) {
    case 'success':   return { pct: 100, color: 'var(--ok)',   pulse: false }
    case 'failed':    return { pct: 100, color: 'var(--er)',   pulse: false }
    case 'cancelled': return { pct: 0,   color: 'var(--tx-2)', pulse: false }
    case 'running':   return { pct: 65,  color: 'var(--info)', pulse: true  }
    case 'retrying':  return { pct: 35,  color: 'var(--wn)',   pulse: true  }
    case 'pending':   return { pct: 12,  color: 'var(--info)', pulse: true  }
    default:          return { pct: 0,   color: 'var(--bg-3)', pulse: false }
  }
}

// ─── Composant JobPill — ligne compacte utilisée dans les deux vues ───────────

function JobPill({
  job,
  showSession,
  sessionName,
  sessionId,
}: {
  job: JobRead
  showSession?: boolean
  sessionName?: string
  sessionId?: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showLog, setShowLog] = useState(false)

  const cancelMutation = useMutation({
    mutationFn: () => jobsApi.cancel(String(job.id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const { pct, color, pulse } = jobProgress(job.status)
  const c = statusColors(job.status)
  const isCancellable = ACTIVE_STATUSES.includes(job.status)
  const hasError = !!job.error_log

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: `1px solid ${hasError && !showLog ? 'var(--er-bd)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      marginBottom: '4px',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ padding: '7px 10px' }}>
        {/* Ligne principale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
          {/* Indicateur statut */}
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: color, flexShrink: 0,
            boxShadow: pulse ? `0 0 0 2px ${color}33` : 'none',
            animation: pulse ? 'statusPulse 2s ease-in-out infinite' : 'none',
          }} />

          {/* Type job */}
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx-0)', flex: 1, minWidth: 0 }}>
            {JOB_TYPE_LABELS[job.type] ?? job.type}
          </span>

          {/* Session — visible en vue timeline */}
          {showSession && sessionName && (
            <button
              onClick={() => sessionId && navigate(`/sessions/${sessionId}`)}
              style={{
                fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, maxWidth: '120px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {sessionName}
            </button>
          )}

          {/* Badge status */}
          <span style={{
            fontSize: '10px', fontWeight: 500, padding: '1px 6px', borderRadius: '3px',
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            flexShrink: 0,
          }}>
            {statusLabel(job.status)}
          </span>

          {/* Durée */}
          <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)', flexShrink: 0, minWidth: '32px', textAlign: 'right' }}>
            {formatDuration(job.duration_s)}
          </span>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {hasError && (
              <button
                onClick={() => setShowLog((v) => !v)}
                title="Voir le log d'erreur"
                style={{
                  background: showLog ? 'var(--er-bg)' : 'none',
                  border: `1px solid ${showLog ? 'var(--er-bd)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  padding: '2px 5px', color: showLog ? 'var(--er)' : 'var(--tx-2)',
                  fontSize: '10px', display: 'flex', alignItems: 'center',
                  transition: 'all 0.1s',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 2h7M1 4.5h5M1 7h3" />
                </svg>
              </button>
            )}
            {isCancellable && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                title="Annuler"
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                  padding: '2px 5px', color: 'var(--tx-2)',
                  display: 'flex', alignItems: 'center',
                  opacity: cancelMutation.isPending ? 0.5 : 1,
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

        {/* Barre de progression + heure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '2px', background: 'var(--bg-3)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, background: color, borderRadius: '1px',
              transition: pulse ? 'none' : 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {job.started_at ? formatTime(job.started_at) : '—'}
          </span>
          {job.attempt > 1 && (
            <span style={{
              fontSize: '9px', padding: '1px 4px', borderRadius: '3px',
              background: 'var(--wn-bg)', color: 'var(--wn)', border: '1px solid var(--wn-bd)',
              flexShrink: 0,
            }}>
              ×{job.attempt}
            </span>
          )}
        </div>
      </div>

      {/* Log erreur dépliable */}
      {showLog && job.error_log && (
        <div style={{
          borderTop: '1px solid var(--er-bd)', background: 'var(--er-bg)',
          padding: '7px 10px', maxHeight: '100px', overflowY: 'auto',
        }}>
          <pre style={{
            fontSize: '10px', color: 'var(--er)', fontFamily: 'var(--font-mono)',
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {job.error_log}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Vue Sessions — groupée par session ──────────────────────────────────────

function SessionGroup({
  session,
  jobs,
  defaultOpen,
}: {
  session: SessionRead
  jobs: JobRead[]
  defaultOpen: boolean
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(defaultOpen)
  const c = statusColors(session.status)

  const activeCount = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length
  const failedCount = jobs.filter((j) => FAILED_STATUSES.includes(j.status)).length

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      marginBottom: '8px', overflow: 'hidden',
      background: 'var(--bg-1)',
    }}>
      {/* En-tête groupe */}
      <div
        style={{
          padding: '9px 12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer',
          background: open ? 'var(--bg-2)' : 'transparent',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.1s',
          userSelect: 'none',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="var(--tx-2)" strokeWidth="1.8" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}
        >
          <path d="M3 2l4 3-4 3" />
        </svg>

        {/* Nom session */}
        <span
          style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx-0)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onClick={(e) => { e.stopPropagation(); navigate(`/sessions/${String(session.id)}`) }}
        >
          {session.name ?? `Session ${String(session.id).slice(0, 8)}`}
        </span>

        {/* Compteurs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {failedCount > 0 && (
            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'var(--er-bg)', color: 'var(--er)', border: '1px solid var(--er-bd)' }}>
              {failedCount} erreur{failedCount > 1 ? 's' : ''}
            </span>
          )}
          {activeCount > 0 && (
            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-bd)' }}>
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
            {statusLabel(session.status)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
            {formatDateShort(session.created_at)}
          </span>
        </div>
      </div>

      {/* Jobs */}
      {open && (
        <div style={{ padding: '8px 10px' }}>
          {jobs.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--tx-2)', padding: '6px 2px' }}>
              Aucun job pour cette session
            </div>
          ) : (
            jobs.map((job) => (
              <JobPill key={String(job.id)} job={job} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Vue Timeline — liste flat chronologique ─────────────────────────────────

function TimelineView({ jobs, sessionsById }: {
  jobs: JobRead[]
  sessionsById: Map<string, SessionRead>
}) {
  if (jobs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <span style={{ fontSize: '12px', color: 'var(--tx-2)' }}>Aucun job à afficher</span>
      </div>
    )
  }

  // Groupe par date (jour)
  const byDay = new Map<string, JobRead[]>()
  for (const job of jobs) {
    const day = new Date(job.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
    const arr = byDay.get(day) ?? []
    arr.push(job)
    byDay.set(day, arr)
  }

  return (
    <div>
      {Array.from(byDay.entries()).map(([day, dayJobs]) => (
        <div key={day} style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '10px', color: 'var(--tx-2)',
            textTransform: 'capitalize', letterSpacing: '0.05em',
            marginBottom: '6px', paddingBottom: '4px',
            borderBottom: '1px solid var(--border)',
          }}>
            {day}
          </div>
          {dayJobs.map((job) => {
            const session = sessionsById.get(String(job.session_id))
            return (
              <JobPill
                key={String(job.id)}
                job={job}
                showSession
                sessionName={session?.name ?? `Session ${String(job.session_id).slice(0, 8)}`}
                sessionId={String(job.session_id)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function QueuePage() {
  const [view,   setView]   = useState<ViewMode>('sessions')
  const [filter, setFilter] = useState<JobFilter>('active')

  // Toutes les sessions avec jobs (statuts actifs + récents)
  const { data: allSessions = [], isLoading: loadingSessions, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn:  () => sessionsApi.list({ limit: 100 }),
    refetchInterval: 5_000,
  })

  // Tous les jobs (on filtre côté client)
  const { data: allJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn:  () => jobsApi.list({ limit: 100 }),
    refetchInterval: 5_000,
  })

  const isLoading = loadingSessions || loadingJobs

  // Filtre jobs selon le mode sélectionné
  const filteredJobs = useMemo(() => {
    let jobs = [...allJobs]
    if (filter === 'active') jobs = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status))
    if (filter === 'failed') jobs = jobs.filter((j) => FAILED_STATUSES.includes(j.status))
    // Tri chronologique décroissant (plus récent en haut)
    return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [allJobs, filter])

  // Sessions qui ont au moins un job correspondant au filtre
  const relevantSessionIds = useMemo(
    () => new Set(filteredJobs.map((j) => String(j.session_id))),
    [filteredJobs]
  )

  const relevantSessions = useMemo(
    () => allSessions.filter((s) => relevantSessionIds.has(String(s.id))),
    [allSessions, relevantSessionIds]
  )

  // Map session_id → session pour la vue timeline
  const sessionsById = useMemo(
    () => new Map(allSessions.map((s) => [String(s.id), s])),
    [allSessions]
  )

  // Jobs groupés par session pour la vue sessions
  const jobsBySession = useMemo(() => {
    const map = new Map<string, JobRead[]>()
    for (const job of filteredJobs) {
      const sid = String(job.session_id)
      const arr = map.get(sid) ?? []
      arr.push(job)
      map.set(sid, arr)
    }
    return map
  }, [filteredJobs])

  // Stats globales pour le bandeau
  const stats = useMemo(() => ({
    active:  allJobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length,
    failed:  allJobs.filter((j) => FAILED_STATUSES.includes(j.status)).length,
    success: allJobs.filter((j) => j.status === 'success').length,
    total:   allJobs.length,
  }), [allJobs])

  const FILTERS: { key: JobFilter; label: string; count: number; color?: string }[] = [
    { key: 'active', label: 'Actifs',  count: stats.active, color: 'var(--info)' },
    { key: 'failed', label: 'Erreurs', count: stats.failed, color: 'var(--er)'   },
    { key: 'all',    label: 'Tous',    count: stats.total   },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        padding: '10px 18px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--tx-0)' }}>
            Queue
          </div>
          <div style={{ fontSize: '11px', color: 'var(--tx-2)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {isLoading ? 'Chargement…' : `${stats.active} actif${stats.active !== 1 ? 's' : ''} · ${stats.failed} erreur${stats.failed !== 1 ? 's' : ''} · ${stats.total} total`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filtres */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {FILTERS.map(({ key, label, count, color }) => {
              const isActive = filter === key
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--radius-md)',
                    border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
                    background: isActive ? 'var(--ac-bg)' : 'var(--bg-2)',
                    color: isActive ? 'var(--ac-tx)' : 'var(--tx-1)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.1s',
                  }}
                >
                  {label}
                  {count > 0 && (
                    <span style={{
                      fontSize: '10px', borderRadius: '10px', padding: '0 5px',
                      minWidth: '16px', textAlign: 'center',
                      background: isActive ? 'var(--ac)' : (color ? `${color}22` : 'var(--bg-3)'),
                      color: isActive ? 'var(--bg-1)' : (color ?? 'var(--tx-2)'),
                      border: color && !isActive ? `1px solid ${color}55` : 'none',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Toggle vue */}
          <div style={{
            display: 'flex', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden',
          }}>
            {([
              { key: 'sessions' as ViewMode, label: 'Sessions',
                icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="9" height="3.5" rx="1" /><rect x="1" y="6.5" width="9" height="3.5" rx="1" /></svg> },
              { key: 'timeline' as ViewMode, label: 'Timeline',
                icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="2" x2="1" y2="10" /><circle cx="1" cy="3" r="1.2" fill="currentColor" stroke="none" /><circle cx="1" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="1" cy="9" r="1.2" fill="currentColor" stroke="none" /><line x1="3" y1="3" x2="10" y2="3" /><line x1="3" y1="6" x2="8" y2="6" /><line x1="3" y1="9" x2="10" y2="9" /></svg> },
            ] as const).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                title={label}
                style={{
                  padding: '5px 10px', background: view === key ? 'var(--ac-bg)' : 'transparent',
                  color: view === key ? 'var(--ac-tx)' : 'var(--tx-2)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', transition: 'all 0.1s',
                }}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Corps ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <Spinner label="Chargement de la queue…" />
          </div>
        )}

        {isError && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <ErrorState message="Orchestrateur injoignable — lancer l'API sur localhost:8001" />
          </div>
        )}

        {!isLoading && !isError && filteredJobs.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '200px', gap: '10px',
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--border-2)" strokeWidth="1.2" style={{ opacity: 0.5 }}>
              <rect x="5" y="10" width="30" height="8" rx="2" />
              <rect x="5" y="22" width="30" height="8" rx="2" />
            </svg>
            <span style={{ fontSize: '12px', color: 'var(--tx-2)' }}>
              {filter === 'active' ? 'Aucun job actif — queue vide' : 'Aucun job à afficher'}
            </span>
            {filter === 'active' && (
              <button
                onClick={() => setFilter('all')}
                style={{
                  fontSize: '11px', padding: '4px 12px',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--tx-1)',
                }}
              >
                Voir tous les jobs
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && filteredJobs.length > 0 && (
          <>
            {view === 'sessions' && (
              <div>
                {relevantSessions.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--tx-2)' }}>Aucune session active</div>
                ) : (
                  relevantSessions.map((session) => (
                    <SessionGroup
                      key={String(session.id)}
                      session={session}
                      jobs={jobsBySession.get(String(session.id)) ?? []}
                      defaultOpen={true}
                    />
                  ))
                )}
              </div>
            )}

            {view === 'timeline' && (
              <TimelineView jobs={filteredJobs} sessionsById={sessionsById} />
            )}
          </>
        )}
      </div>

      {/* ── Footer stats ────────────────────────────────────────────────────── */}
      {!isLoading && allJobs.length > 0 && (
        <div style={{
          background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
          padding: '6px 18px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--tx-1)' },
            { label: 'Succès', value: stats.success, color: 'var(--ok)' },
            { label: 'Actifs', value: stats.active,  color: 'var(--info)' },
            { label: 'Erreurs', value: stats.failed,  color: 'var(--er)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 500, color }}>
                {value}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>{label}</span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
            Polling 5s
          </span>
        </div>
      )}
    </div>
  )
}