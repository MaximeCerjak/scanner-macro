import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SessionDetail, JobRead } from '../../../api/client'
import { qaApi } from '../../../api/client'
import { MetaTab } from './tabs/MetaTab'
import { JobsTab } from './tabs/JobsTab'
import { QaTab }   from './tabs/QaTab'

type DetailTab = 'meta' | 'jobs' | 'qa'

interface DetailPanelProps {
  session: SessionDetail
  jobs: JobRead[]
}

export function DetailPanel({ session, jobs }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('meta')

  // Pré-fetch du résumé QA pour afficher le badge passed/failed
  const { data: qaSummary } = useQuery({
    queryKey: ['qa-summary', String(session.id)],
    queryFn: () => qaApi.summary(String(session.id)),
    // Ne fetch que si le pipeline a démarré
    enabled: ['processing', 'processed', 'exporting', 'done', 'failed'].includes(session.status),
    staleTime: 30_000,
  })

  const activeJobCount  = jobs.filter((j) => ['pending', 'running', 'retrying'].includes(j.status)).length
  const failedJobCount  = jobs.filter((j) => j.status === 'failed').length

  const TABS: { key: DetailTab; label: string; badge?: { value: number | string; variant: 'neutral' | 'ok' | 'error' | 'warn' } }[] = [
    { key: 'meta', label: 'Infos' },
    {
      key: 'jobs',
      label: 'Jobs',
      badge: jobs.length > 0
        ? failedJobCount > 0
          ? { value: failedJobCount, variant: 'error' }
          : activeJobCount > 0
          ? { value: activeJobCount, variant: 'warn' }
          : { value: jobs.length, variant: 'neutral' }
        : undefined,
    },
    {
      key: 'qa',
      label: 'QA',
      badge: qaSummary
        ? qaSummary.failed > 0
          ? { value: `${qaSummary.passed}/${qaSummary.passed + qaSummary.failed}`, variant: 'error' }
          : { value: qaSummary.passed, variant: 'ok' }
        : undefined,
    },
  ]

  const badgeStyle = (variant: 'neutral' | 'ok' | 'error' | 'warn', isActive: boolean) => {
    if (variant === 'ok')      return { bg: 'var(--ok-bg)',   color: 'var(--ok)',   border: 'var(--ok-bd)'  }
    if (variant === 'error')   return { bg: 'var(--er-bg)',   color: 'var(--er)',   border: 'var(--er-bd)'  }
    if (variant === 'warn')    return { bg: 'var(--wn-bg)',   color: 'var(--wn)',   border: 'var(--wn-bd)'  }
    return isActive
      ? { bg: 'var(--ac)',    color: 'var(--bg-1)', border: 'transparent' }
      : { bg: 'var(--bg-3)', color: 'var(--tx-2)', border: 'transparent' }
  }

  return (
    <div style={{
      width: '260px', flexShrink: 0,
      background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(({ key, label, badge }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '9px 4px', fontSize: '11px',
                color: isActive ? 'var(--ac)' : 'var(--tx-2)',
                borderBottom: `2px solid ${isActive ? 'var(--ac)' : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                transition: 'color 0.1s',
              }}
            >
              {label}
              {badge && (
                <span style={{
                  fontSize: '10px', padding: '0 4px', borderRadius: '8px',
                  minWidth: '16px', textAlign: 'center',
                  ...(() => {
                    const s = badgeStyle(badge.variant, isActive)
                    return { background: s.bg, color: s.color, border: `1px solid ${s.border}` }
                  })(),
                }}>
                  {badge.value}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'meta' && <MetaTab session={session} />}
        {activeTab === 'jobs' && <JobsTab jobs={jobs} sessionId={String(session.id)} />}
        {activeTab === 'qa'   && <QaTab sessionId={String(session.id)} />}
      </div>
    </div>
  )
}