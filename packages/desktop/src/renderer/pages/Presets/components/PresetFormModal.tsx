import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Modal, FormField, TextInput,
  BtnPrimary, BtnSecondary,
} from '../../../components/ui/Modal'
import { presetsApi } from '../../../api/client'
import type { PresetRead, PresetCreate } from '../../../api/client'

// ─── Types unions explicites (fix TS2322) ────────────────────────────────────

type TierValue      = 'fast' | 'standard' | 'high_fidelity'
type StackModeValue = 'none' | 'light' | 'full'

// ─── Constantes domaine ───────────────────────────────────────────────────────

const TIERS: { value: TierValue; label: string; hint: string }[] = [
  { value: 'fast',          label: 'Rapide',         hint: 'Acquisition ~5 min, résolution réduite'   },
  { value: 'standard',      label: 'Standard',       hint: 'Acquisition ~15 min, bon compromis'        },
  { value: 'high_fidelity', label: 'Haute fidélité', hint: 'Acquisition ~45 min, résolution maximale' },
]

const STACK_MODES: { value: StackModeValue; label: string; hint: string }[] = [
  { value: 'none',  label: 'Aucun',   hint: 'Pas de focus stacking — image unique par angle' },
  { value: 'light', label: 'Léger',   hint: 'Stacking rapide, ~3–5 plans fusionnés'          },
  { value: 'full',  label: 'Complet', hint: 'Stacking exhaustif sur tous les plans'           },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function estimatedCapture(rings: number, step: number, planes: number) {
  const anglesPerRing = Math.ceil(360 / step)
  const totalViews    = anglesPerRing * rings * planes
  const totalMin      = Math.round(totalViews / 60 * 1.2)
  return { anglesPerRing, totalViews, totalMin }
}

/** Formate des minutes → "~X min" ou "~Xh Ymin". Exporté pour PresetCard. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `~${h}h` : `~${h}h ${m}min`
}

// ─── TierSelector ────────────────────────────────────────────────────────────

function TierSelector({
  value, onChange,
}: {
  value: TierValue
  onChange: (v: TierValue) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {TIERS.map(({ value: v, label, hint }) => {
        const isActive = value === v
        return (
          <button key={v} type="button" onClick={() => onChange(v)} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', borderRadius: 'var(--radius-md)',
            border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
            background: isActive ? 'var(--ac-bg)' : 'var(--bg-0)',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
          }}>
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
              border: isActive ? '4px solid var(--ac)' : '1.5px solid var(--border-2)',
              transition: 'all 0.15s',
            }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: isActive ? 'var(--ac-tx)' : 'var(--tx-0)' }}>
                {label}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '1px' }}>{hint}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── StackModeSelector ───────────────────────────────────────────────────────

function StackModeSelector({
  value, onChange,
}: {
  value: StackModeValue
  onChange: (v: StackModeValue) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {STACK_MODES.map(({ value: v, label, hint }) => {
        const isActive = value === v
        return (
          <button key={v} type="button" onClick={() => onChange(v)} title={hint} style={{
            flex: 1, padding: '7px 8px', borderRadius: 'var(--radius-md)',
            border: isActive ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
            background: isActive ? 'var(--ac-bg)' : 'var(--bg-0)',
            color: isActive ? 'var(--ac-tx)' : 'var(--tx-1)',
            fontSize: '11px', fontWeight: isActive ? 500 : 400,
            cursor: 'pointer', transition: 'all 0.1s',
          }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── SliderField — slider + input numérique clavier ──────────────────────────

function SliderField({
  label, value, onChange, min, max, step, unit, hint, error,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  unit?: string
  hint?: string
  error?: string
}) {
  // Valeur locale du champ texte — découplée pour permettre la saisie en cours
  const [inputVal, setInputVal] = useState(String(value))

  // Resync si value change depuis l'extérieur (reset preset, slide)
  useEffect(() => { setInputVal(String(value)) }, [value])

  function commit(raw: string) {
    const n = parseInt(raw, 10)
    if (!isNaN(n)) {
      // Clamp dans [min, max] puis snap au step le plus proche
      const clamped = Math.min(max, Math.max(min, n))
      const snapped = Math.round(clamped / step) * step
      onChange(snapped)
      setInputVal(String(snapped))
    } else {
      setInputVal(String(value)) // saisie invalide → revert
    }
  }

  return (
    <FormField label={label} error={error} hint={hint}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Slider */}
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            onChange(n)
            setInputVal(String(n))
          }}
          style={{ flex: 1, accentColor: 'var(--ac)', cursor: 'pointer' }}
        />

        {/* Input numérique — saisie clavier précise */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
          <input
            type="number"
            min={min} max={max} step={step}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={(e)    => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  commit((e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setInputVal(String(value))
            }}
            style={{
              width: unit ? '46px' : '54px',
              background: 'var(--bg-0)',
              border: '1px solid var(--border-2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--tx-0)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 500,
              padding: '3px 6px',
              textAlign: 'right',
              outline: 'none',
              // Masquer les spinners natifs
              MozAppearance: 'textfield',
            } as React.CSSProperties}
          />
          {unit && (
            <span style={{ fontSize: '10px', color: 'var(--tx-2)', userSelect: 'none' }}>
              {unit}
            </span>
          )}
        </div>
      </div>
    </FormField>
  )
}

// ─── Modal principale ─────────────────────────────────────────────────────────

interface PresetFormModalProps {
  preset?: PresetRead
  onClose: () => void
}

export function PresetFormModal({ preset, onClose }: PresetFormModalProps) {
  const queryClient = useQueryClient()
  const isEdit   = !!preset
  const isSystem = preset?.is_system ?? false

  // États typés explicitement — évite l'inférence de literal union (fix TS2322)
  const [name,      setName]      = useState<string>(preset?.name ?? '')
  const [tier,      setTier]      = useState<TierValue>((preset?.tier as TierValue) ?? 'standard')
  const [rings,     setRings]     = useState<number>(preset?.rings ?? 2)
  const [stepDeg,   setStepDeg]   = useState<number>(preset?.angular_step_deg ?? 15)
  const [planes,    setPlanes]    = useState<number>(preset?.focus_planes ?? 20)
  const [stackMode, setStackMode] = useState<StackModeValue>((preset?.stack_mode as StackModeValue) ?? 'light')
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  useEffect(() => {
    setName((preset?.name ?? ''))
    setTier((preset?.tier as TierValue) ?? 'standard')
    setRings(preset?.rings ?? 2)
    setStepDeg(preset?.angular_step_deg ?? 15)
    setPlanes(preset?.focus_planes ?? 20)
    setStackMode((preset?.stack_mode as StackModeValue) ?? 'light')
    setErrors({})
  }, [preset])

  const mutation = useMutation({
    mutationFn: (payload: PresetCreate) =>
      isEdit
        ? presetsApi.update(String(preset!.id), payload)
        : presetsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['presets'] })
      onClose()
    },
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Le nom est requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate() || isSystem) return
    mutation.mutate({ name: name.trim(), tier, rings, angular_step_deg: stepDeg, focus_planes: planes, stack_mode: stackMode })
  }

  const { anglesPerRing, totalViews, totalMin } = estimatedCapture(rings, stepDeg, planes)

  return (
    <Modal
      title={isSystem ? `Preset système — ${preset!.name}` : isEdit ? `Modifier — ${preset!.name}` : 'Nouveau preset'}
      onClose={onClose}
      width={540}
      footer={
        isSystem ? (
          <BtnSecondary onClick={onClose}>Fermer</BtnSecondary>
        ) : (
          <>
            <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
            <BtnPrimary onClick={handleSubmit} loading={mutation.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer le preset'}
            </BtnPrimary>
          </>
        )
      }
    >
      {isSystem && (
        <div style={{
          background: 'var(--info-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '9px 12px',
          marginBottom: '16px', fontSize: '11px', color: 'var(--info)',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="5.5" /><line x1="6.5" y1="4" x2="6.5" y2="7.5" />
            <circle cx="6.5" cy="9.5" r="0.7" fill="currentColor" />
          </svg>
          Ce preset est géré par le système et ne peut pas être modifié. Utilisez «&nbsp;Dupliquer&nbsp;» pour créer une version personnalisée.
        </div>
      )}

      {mutation.isError && (
        <div style={{
          background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
          borderRadius: 'var(--radius-md)', padding: '9px 12px',
          marginBottom: '16px', fontSize: '11px', color: 'var(--er)',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="5.5" /><line x1="6.5" y1="4" x2="6.5" y2="7.5" />
            <circle cx="6.5" cy="9.5" r="0.7" fill="currentColor" />
          </svg>
          {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la sauvegarde'}
        </div>
      )}

      <div style={{ opacity: isSystem ? 0.6 : 1, pointerEvents: isSystem ? 'none' : 'auto' }}>
        <FormField label="Nom" required error={errors.name}>
          <TextInput
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
            placeholder="ex : Insectes – haute résolution"
            maxLength={128}
            autoFocus={!isSystem}
          />
        </FormField>

        <FormField label="Niveau de qualité">
          <TierSelector value={tier} onChange={setTier} />
        </FormField>

        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '14px 14px 6px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--tx-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Géométrie d'acquisition
          </div>
          <SliderField
            label="Anneaux de caméras" value={rings} onChange={setRings}
            min={1} max={9} step={1}
            hint="Nombre de hauteurs angulaires autour du spécimen"
          />
          <SliderField
            label="Pas angulaire" value={stepDeg} onChange={setStepDeg}
            min={5} max={45} step={5} unit="°"
            hint={`${anglesPerRing} positions autour du spécimen`}
          />
          <SliderField
            label="Plans de focus" value={planes} onChange={setPlanes}
            min={1} max={200} step={1}
            hint="Profondeur de la pile de focus stacking"
          />
        </div>

        <FormField label="Mode focus stacking">
          <StackModeSelector value={stackMode} onChange={setStackMode} />
        </FormField>
      </div>

      {/* Résumé */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px', marginTop: '4px',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
          Résumé
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Angles / anneau', value: String(anglesPerRing) },
            { label: "Total d'images",  value: totalViews.toLocaleString('fr-FR'), highlight: true },
            { label: 'Durée estimée',   value: formatDuration(totalMin) },
            { label: 'Stack mode',      value: stackMode },
          ].map(({ label, value, highlight }) => (
            <div key={label}>
              <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginBottom: '2px' }}>{label}</div>
              <div style={{
                fontSize: '13px', fontFamily: 'var(--font-mono)',
                fontWeight: highlight ? 500 : 400,
                color: highlight ? 'var(--ac-tx)' : 'var(--tx-0)',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
        {totalViews > 3000 && (
          <div style={{
            marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--wn)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
              <path d="M6 1.5L11 10.5H1L6 1.5z" /><line x1="6" y1="5" x2="6" y2="8" />
              <circle cx="6" cy="9.5" r="0.6" fill="currentColor" />
            </svg>
            Session longue — vérifier l'espace disque disponible avant de lancer
          </div>
        )}
      </div>
    </Modal>
  )
}