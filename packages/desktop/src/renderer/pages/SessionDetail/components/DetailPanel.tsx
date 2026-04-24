import { useState } from 'react'
import type { SessionDetail, JobRead } from '../../../api/client'
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

  const TABS: { key: DetailTab; label: string; count?: number }[] = [
    { key: 'meta', label: 'Métadonnées' },
    { key: 'jobs', label: 'Jobs', count: jobs.length > 0 ? jobs.length : undefined },
    { key: 'qa',   label: 'QA' },
  ]

  return (
    <div style={{
      width: '260px', flexShrink: 0,
      background: 'var(--bg-1)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 4px', fontSize: '11px',
              color: activeTab === key ? 'var(--ac)' : 'var(--tx-2)',
              borderBottom: `2px solid ${activeTab === key ? 'var(--ac)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              transition: 'color 0.1s',
            }}
          >
            {label}
            {count !== undefined && (
              <span style={{
                fontSize: '10px', padding: '0 4px', borderRadius: '8px',
                background: activeTab === key ? 'var(--ac)' : 'var(--bg-3)',
                color: activeTab === key ? 'var(--bg-1)' : 'var(--tx-2)',
                minWidth: '16px', textAlign: 'center',
              }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'meta' && <MetaTab session={session} />}
        {activeTab === 'jobs' && <JobsTab jobs={jobs} />}
        {activeTab === 'qa'   && <QaTab sessionId={String(session.id)} />}
      </div>
    </div>
  )
}