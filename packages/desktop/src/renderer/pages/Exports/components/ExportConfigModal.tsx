import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, FormField, BtnPrimary, BtnSecondary } from '../../../components/ui/Modal'
import { sessionsApi } from '../../../api/client'
import type { SessionRead } from '../../../api/client'

// ─── Constantes ───────────────────────────────────────────────────────────────

const FORMATS = [
  { value: 'glb', label: 'GLB',  hint: 'Format web 3D — recommandé pour visualisation' },
  { value: 'obj', label: 'OBJ',  hint: 'Interopérabilité maximale (+ MTL + textures)'  },
  { value: 'stl', label: 'STL',  hint: 'Géométrie seule — impression 3D'               },
]

const LOD_OPTIONS = [
  { value: 1, label: '1 niveau',   hint: 'Résolution maximale uniquement' },
  { value: 2, label: '2 niveaux',  hint: 'Full + ×0.5' },
  { value: 3, label: '3 niveaux',  hint: 'Full + ×0.5 + ×0.25 — recommandé web' },
]

const TEXTURE_RESOLUTIONS = [
  { value: 1024, label: '1K',  hint: 'Léger, aperçu rapide' },
  { value: 2048, label: '2K',  hint: 'Recommandé — bon compromis' },
  { value: 4096, label: '4K',  hint: 'Haute qualité' },
  { value: 8192, label: '8K',  hint: 'Très lourd — musée / archivage' },
]

// Estimation de la taille finale (approximation empirique)
function estimateSize(formats: string[], lodLevels: number, texRes: number): string {
  const basePerFormat: Record<string, number> = { glb: 15, obj: 12, stl: 8 }
  const texFactor = (texRes / 2048) ** 2
  let total = 0
  for (const f of formats) {
    const base = basePerFormat[f] ?? 10
    total += base * texFactor * lodLevels * 0.6
  }
  if (total < 1) return `~${Math.round(total * 1024)} Ko`
  return `~${Math.round(total)} Mo`
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface ExportConfigModalProps {
  session: SessionRead
  onClose: () => void
}

export function ExportConfigModal({ session, onClose }: ExportConfigModalProps) {
  const queryClient = useQueryClient()

  const [selectedFormats, setSelectedFormats] = useState<string[]>(['glb'])
  const [lodLevels,       setLodLevels]       = useState(2)
  const [texRes,          setTexRes]           = useState(2048)
  const [error,           setError]            = useState('')

  function toggleFormat(f: string) {
    setSelectedFormats((prev) =>
      prev.includes(f)
        ? prev.length > 1 ? prev.filter((x) => x !== f) : prev // au moins 1
        : [...prev, f]
    )
  }

  const mutation = useMutation({
    mutationFn: () =>
      sessionsApi.startExport(String(session.id), {
        formats: selectedFormats,
        lod_levels: lodLevels,
        texture_resolution: texRes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', String(session.id)] })
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
      onClose()
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erreur lors du lancement de l\'export')
    },
  })

  const sizeEstimate = estimateSize(selectedFormats, lodLevels, texRes)

  return (
    <Modal
      title="Configurer l'export"
      onClose={onClose}
      width={480}
      footer={
        <>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <BtnPrimary onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Lancer l'export
          </BtnPrimary>
        </>
      }
    >
      {/* Info session */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '9px 12px',
        marginBottom: '16px', fontSize: '11px', color: 'var(--tx-1)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--tx-2)" strokeWidth="1.5">
          <rect x="1.5" y="2" width="10" height="9" rx="1" />
          <line x1="4" y1="5" x2="9" y2="5" />
          <line x1="4" y1="7.5" x2="7" y2="7.5" />
        </svg>
        <span>
          <strong style={{ color: 'var(--tx-0)' }}>{session.name ?? `Session ${String(session.id).slice(0, 8)}`}</strong>
          {' '}— les assets seront générés et stockés sur MinIO
        </span>
      </div>

      {/* Erreur API */}
      {error && (
        <div style={{
          background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
          borderRadius: 'var(--radius-md)', padding: '9px 12px',
          marginBottom: '12px', fontSize: '11px', color: 'var(--er)',
        }}>
          {error}
        </div>
      )}

      {/* Formats */}
      <FormField label="Formats de sortie" hint="Plusieurs formats possibles simultanément">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {FORMATS.map(({ value, label, hint }) => {
            const isActive = selectedFormats.includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleFormat(value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 11px', borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
                  background: isActive ? 'var(--ac-bg)' : 'var(--bg-0)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                }}
              >
                {/* Checkbox visuel */}
                <div style={{
                  width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                  border: isActive ? '1px solid var(--ac)' : '1px solid var(--border-2)',
                  background: isActive ? 'var(--ac)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}>
                  {isActive && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--bg-1)" strokeWidth="1.8" strokeLinecap="round">
                      <polyline points="1.5,4 3,5.5 6.5,2" />
                    </svg>
                  )}
                </div>
                <div>
                  <span style={{
                    fontSize: '12px', fontWeight: 500,
                    color: isActive ? 'var(--ac-tx)' : 'var(--tx-0)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    .{label.toLowerCase()}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--tx-2)', marginLeft: '8px' }}>
                    {hint}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </FormField>

      {/* LOD */}
      <FormField label="Niveaux de détail (LOD)">
        <div style={{ display: 'flex', gap: '6px' }}>
          {LOD_OPTIONS.map(({ value, label, hint }) => {
            const isActive = lodLevels === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLodLevels(value)}
                title={hint}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
                  background: isActive ? 'var(--ac-bg)' : 'var(--bg-0)',
                  color: isActive ? 'var(--ac-tx)' : 'var(--tx-1)',
                  fontSize: '11px', fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '4px' }}>
          {LOD_OPTIONS.find((o) => o.value === lodLevels)?.hint}
        </div>
      </FormField>

      {/* Résolution texture */}
      <FormField label="Résolution des textures">
        <div style={{ display: 'flex', gap: '6px' }}>
          {TEXTURE_RESOLUTIONS.map(({ value, label, hint }) => {
            const isActive = texRes === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTexRes(value)}
                title={hint}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: 'var(--radius-md)',
                  border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
                  background: isActive ? 'var(--ac-bg)' : 'var(--bg-0)',
                  color: isActive ? 'var(--ac-tx)' : 'var(--tx-1)',
                  fontSize: '11px', fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer', transition: 'all 0.1s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '4px' }}>
          {TEXTURE_RESOLUTIONS.find((r) => r.value === texRes)?.hint}
        </div>
      </FormField>

      {/* Estimation */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '10px 12px',
        marginTop: '4px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>Taille estimée</span>
        <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--tx-0)' }}>
          {sizeEstimate}
        </span>
      </div>
    </Modal>
  )
}