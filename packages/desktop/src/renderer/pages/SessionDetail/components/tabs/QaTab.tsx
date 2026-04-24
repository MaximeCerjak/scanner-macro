import { useQuery } from '@tanstack/react-query'
import { qaApi } from '../../../../api/client'
import type { QaCheckRead } from '../../../../api/client'

function qaLabel(type: string): string {
  const map: Record<string, string> = {
    sharpness_laplacian: 'Netteté (Laplacien)',
    alignment_rate:      'Taux alignement',
    reprojection_error:  'Erreur reprojection',
    mesh_holes:          'Trous mesh',
    texture_coverage:    'Couverture texture',
    checksum:            'Intégrité fichiers',
    scale_consistency:   'Cohérence échelle',
  }
  return map[type] ?? type
}

function qaColor(check: QaCheckRead): string {
  if (!check.passed) return 'var(--er)'
  if (check.score != null) {
    if (check.score > 0.9) return 'var(--ok)'
    if (check.score > 0.7) return 'var(--wn)'
    return 'var(--er)'
  }
  return 'var(--ok)'
}

function qaBarColor(check: QaCheckRead): string {
  if (!check.passed) return 'var(--er)'
  if (check.score != null) {
    if (check.score > 0.9) return 'var(--ok)'
    if (check.score > 0.7) return 'var(--wn)'
    return 'var(--er)'
  }
  return 'var(--ok)'
}

export function QaTab({ sessionId }: { sessionId: string }) {
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['qa', sessionId],
    queryFn: () => qaApi.list(sessionId),
  })

  if (isLoading) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--tx-2)', fontSize: '11px',
      }}>
        Chargement…
      </div>
    )
  }

  if (checks.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--tx-2)', fontSize: '11px',
      }}>
        Aucun check QA — pipeline non terminé
      </div>
    )
  }

  const passed = checks.filter((c) => c.passed).length
  const total  = checks.length
  const allOk  = passed === total

  return (
    <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
      <div style={{
        background: allOk ? 'var(--ok-bg)' : 'var(--wn-bg)',
        border: `1px solid ${allOk ? 'var(--ok-bd)' : 'var(--wn-bd)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '8px 10px', marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
          stroke={allOk ? 'var(--ok)' : 'var(--wn)'} strokeWidth="1.8">
          {allOk
            ? <polyline points="2.5,7 5.5,10 11.5,4" />
            : <>
                <line x1="7" y1="3" x2="7" y2="8" />
                <circle cx="7" cy="10" r="0.7" fill="currentColor" />
              </>
          }
        </svg>
        <span style={{
          fontSize: '11px', fontWeight: 500,
          color: allOk ? 'var(--ok)' : 'var(--wn)',
        }}>
          {passed} / {total} checks passés
        </span>
      </div>

      {checks.map((check) => {
        const pct = check.score != null
          ? Math.min(Math.round(check.score * 100), 100)
          : check.passed ? 100 : 0

        return (
          <div key={String(check.id)} style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '11px', color: 'var(--tx-1)' }}>
                {qaLabel(check.check_type)}
              </span>
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 500,
                color: qaColor(check),
              }}>
                {check.score != null
                  ? `${(check.score * 100).toFixed(1)}%`
                  : check.passed ? 'OK' : 'KO'}
              </span>
            </div>
            <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: `${pct}%`, background: qaBarColor(check),
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}