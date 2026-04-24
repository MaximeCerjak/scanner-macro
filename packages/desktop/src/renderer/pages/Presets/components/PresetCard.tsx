import type { PresetRead } from '../../../api/client'
import { formatDuration } from './PresetFormModal'

// ─── Helpers visuels ─────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  fast:          { label: 'Rapide',         color: 'var(--ok)',    bg: 'var(--ok-bg)',   border: 'var(--ok-bd)'   },
  standard:      { label: 'Standard',       color: 'var(--info)',  bg: 'var(--info-bg)', border: 'var(--info-bd)' },
  high_fidelity: { label: 'Haute fidélité', color: 'var(--ac-tx)', bg: 'var(--ac-bg)',   border: 'var(--ac-bd)'   },
}

const STACK_LABELS: Record<string, string> = {
  none:  'Pas de stack',
  light: 'Stack léger',
  full:  'Stack complet',
}

function estimateCapture(rings: number, step: number, planes: number) {
  const anglesPerRing = Math.ceil(360 / step)
  const totalViews    = anglesPerRing * rings * planes
  const totalMin      = Math.round(totalViews / 60 * 1.2)
  return { anglesPerRing, totalViews, totalMin }
}

// ─── Icône anneaux ────────────────────────────────────────────────────────────

function RingsIcon({ rings, selected }: { rings: number; selected: boolean }) {
  const color = selected ? 'var(--ac)' : 'var(--border-2)'
  const maxR  = 22
  const step  = maxR / (rings + 1)
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none"
      style={{ opacity: selected ? 0.7 : 0.3, transition: 'opacity 0.15s' }}>
      {Array.from({ length: rings }, (_, i) => (
        <circle
          key={i} cx="26" cy="26" r={(i + 1) * step}
          stroke={color} strokeWidth="1"
          strokeDasharray={i === rings - 1 ? 'none' : '2 3'}
        />
      ))}
      <circle cx="26" cy="26" r="2.5" fill={color} />
      <line x1="26" y1="3" x2="26" y2="49" stroke={color} strokeWidth="0.5" strokeDasharray="1 4" />
      <line x1="3" y1="26" x2="49" y2="26" stroke={color} strokeWidth="0.5" strokeDasharray="1 4" />
    </svg>
  )
}

// ─── Composant carte ──────────────────────────────────────────────────────────

interface PresetCardProps {
  preset: PresetRead
  selected: boolean
  onSelect: () => void
  onDoubleClick: () => void
}

export function PresetCard({ preset, selected, onSelect, onDoubleClick }: PresetCardProps) {
  const tier = TIER_CONFIG[preset.tier] ?? TIER_CONFIG.standard
  const { anglesPerRing, totalViews, totalMin } = estimateCapture(
    preset.rings, preset.angular_step_deg, preset.focus_planes
  )

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      style={{
        background: 'var(--bg-1)',
        border: selected ? '1.5px solid var(--ac)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'border-color 0.1s',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Zone visuelle */}
      <div style={{
        height: '80px', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <RingsIcon rings={preset.rings} selected={selected} />
        {preset.is_system && (
          <div style={{
            position: 'absolute', top: '7px', right: '7px',
            fontSize: '9px', fontWeight: 500,
            padding: '2px 6px', borderRadius: '3px',
            background: 'var(--ac-bg)', color: 'var(--ac-tx)', border: '1px solid var(--ac-bd)',
          }}>
            Système
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ padding: '10px 11px 12px' }}>
        {/* Nom */}
        <div style={{
          fontSize: '12px', fontWeight: 500, color: 'var(--tx-0)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: '6px',
        }}>
          {preset.name}
        </div>

        {/* Tier badge */}
        <div style={{ marginBottom: '8px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 500,
            padding: '2px 7px', borderRadius: '3px',
            background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
          }}>
            {tier.label}
          </span>
        </div>

        {/* Métriques */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>Anneaux</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--tx-0)' }}>
              {preset.rings}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>Angles</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--tx-0)' }}>
              {anglesPerRing} × {preset.angular_step_deg}°
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>Plans Z</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--tx-0)' }}>
              {preset.focus_planes}
            </span>
          </div>

          {/* Séparateur + totaux */}
          <div style={{
            marginTop: '4px', paddingTop: '5px',
            borderTop: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: '3px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>Total images</span>
              <span style={{
                fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
                color: totalViews > 3000 ? 'var(--wn)' : 'var(--ac-tx)',
              }}>
                {totalViews.toLocaleString('fr-FR')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>Durée ~</span>
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: totalMin > 60 ? 'var(--wn)' : 'var(--tx-1)',
              }}>
                {formatDuration(totalMin)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>Stacking</span>
              <span style={{ fontSize: '10px', color: 'var(--tx-1)' }}>
                {STACK_LABELS[preset.stack_mode] ?? preset.stack_mode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}