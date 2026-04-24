import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { presetsApi } from '../../../api/client'
import type { PresetRead } from '../../../api/client'
import { MetaRow, Divider, SectionTitle } from '../../../components/ui/Shared'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  fast:          'Rapide',
  standard:      'Standard',
  high_fidelity: 'Haute fidélité',
}

const STACK_LABELS: Record<string, string> = {
  none:  'Aucun',
  light: 'Léger',
  full:  'Complet',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function estimateViews(rings: number, step: number, planes: number) {
  const anglesPerRing = Math.ceil(360 / step)
  const total = anglesPerRing * rings * planes
  const durationMin = Math.round(total / 60 * 1.2)
  return { anglesPerRing, total, durationMin }
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface PresetInspectorProps {
  preset: PresetRead | null
  onEdit:      (p: PresetRead) => void
  onDuplicate: (p: PresetRead) => void
  onDeleted:   () => void
}

export function PresetInspector({
  preset, onEdit, onDuplicate, onDeleted,
}: PresetInspectorProps) {
  const queryClient = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => presetsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['presets'] })
      setConfirmDelete(false)
      onDeleted()
    },
  })

  // Ferme la confirmation si on change de preset sélectionné
  if (!preset) {
    return (
      <aside style={{
        width: '220px',
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: '20px',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--tx-2)', fontSize: '11px' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '1px dashed var(--border-2)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="4" x2="13" y2="4" />
              <line x1="3" y1="8" x2="13" y2="8" />
              <line x1="3" y1="12" x2="8" y2="12" />
            </svg>
          </div>
          Sélectionner un preset
        </div>
      </aside>
    )
  }

  const { anglesPerRing, total, durationMin } = estimateViews(
    preset.rings, preset.angular_step_deg, preset.focus_planes
  )

  return (
    <aside style={{
      width: '220px',
      borderLeft: '1px solid var(--border)',
      background: 'var(--bg-1)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* En-tête */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '13px', fontWeight: 500, color: 'var(--tx-0)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: '4px',
        }}>
          {preset.name}
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {preset.is_system && (
            <span style={{
              fontSize: '10px', padding: '2px 6px', borderRadius: '3px',
              background: 'var(--ac-bg)', color: 'var(--ac-tx)', border: '1px solid var(--ac-bd)',
            }}>
              Système
            </span>
          )}
          <span style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: '3px',
            background: 'var(--bg-3)', color: 'var(--tx-2)', border: '1px solid var(--border)',
          }}>
            {TIER_LABELS[preset.tier] ?? preset.tier}
          </span>
        </div>
      </div>

      {/* Corps — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <SectionTitle>Paramètres</SectionTitle>
        <MetaRow label="Anneaux"       value={String(preset.rings)} />
        <MetaRow label="Pas angulaire" value={`${preset.angular_step_deg}°`} />
        <MetaRow label="Plans focus"   value={String(preset.focus_planes)} />
        <MetaRow label="Stacking"      value={STACK_LABELS[preset.stack_mode] ?? preset.stack_mode} />

        <Divider />
        <SectionTitle>Estimation</SectionTitle>
        <MetaRow label="Angles / anneau" value={String(anglesPerRing)} />
        <MetaRow label="Total images"    value={total.toLocaleString('fr-FR')} mono />
        <MetaRow label="Durée ~"         value={`${durationMin} min`} mono />

        <Divider />
        <SectionTitle>Infos</SectionTitle>
        {preset.parent_id && (
          <MetaRow label="Dupliqué de" value={String(preset.parent_id).slice(0, 8)} mono />
        )}
        <MetaRow label="Créé le" value={formatDate(preset.created_at)} />
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flexShrink: 0,
      }}>
        {/* Dupliquer — toujours disponible */}
        <button
          onClick={() => onDuplicate(preset)}
          style={{
            width: '100%', padding: '6px', fontSize: '11px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            color: 'var(--tx-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="3" width="7" height="8" rx="1" />
            <path d="M4 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1H9" />
          </svg>
          Dupliquer
        </button>

        {/* Éditer — uniquement presets non-système */}
        {!preset.is_system && (
          <button
            onClick={() => onEdit(preset)}
            style={{
              width: '100%', padding: '6px', fontSize: '11px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--tx-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" />
            </svg>
            Modifier
          </button>
        )}

        {/* Supprimer — uniquement presets non-système */}
        {!preset.is_system && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', padding: '6px', fontSize: '11px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              color: 'var(--er)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="2,3 10,3" />
              <path d="M4 3V2h4v1" />
              <path d="M3 3l.5 7h5L9 3" />
            </svg>
            Supprimer
          </button>
        )}

        {/* Confirmation suppression */}
        {!preset.is_system && confirmDelete && (
          <div style={{
            background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
            borderRadius: 'var(--radius-md)', padding: '10px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--er)', marginBottom: '8px', lineHeight: 1.4 }}>
              Supprimer ce preset ? Les sessions existantes ne seront pas affectées.
            </div>
            {deleteMutation.isError && (
              <div style={{ fontSize: '10px', color: 'var(--er)', marginBottom: '6px' }}>
                {deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : 'Preset utilisé par des sessions existantes'}
              </div>
            )}
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => { setConfirmDelete(false); deleteMutation.reset() }}
                style={{
                  flex: 1, padding: '5px', fontSize: '11px',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--tx-1)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(String(preset.id))}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1, padding: '5px', fontSize: '11px', fontWeight: 500,
                  background: deleteMutation.isPending ? 'var(--bg-3)' : 'var(--er)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                  color: deleteMutation.isPending ? 'var(--tx-2)' : '#fff',
                }}
              >
                {deleteMutation.isPending ? '…' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}