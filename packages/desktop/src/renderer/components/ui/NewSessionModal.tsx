import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, FormField, TextInput, TextareaInput, BtnPrimary, BtnSecondary } from './Modal'
import { sessionsApi, specimensApi, presetsApi } from '../../api/client'
import type { SessionCreate, SpecimenRead, PresetRead } from '../../api/client'

// ─── Select custom ────────────────────────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
  sublabel?: string
  tag?: string
}

function CustomSelect({
  options, value, onChange, placeholder, loading, error,
}: {
  options: SelectOption[]
  value: string
  onChange: (v: string) => void
  placeholder: string
  loading?: boolean
  error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => !loading && setOpen((o) => !o)}
        style={{
          width: '100%',
          background: 'var(--bg-0)',
          border: `1px solid ${error ? 'var(--er-bd)' : open ? 'var(--ac-bd)' : 'var(--border-2)'}`,
          borderRadius: 'var(--radius-md)',
          color: selected ? 'var(--tx-0)' : 'var(--tx-2)',
          fontSize: '12px',
          padding: '7px 32px 7px 10px',
          cursor: loading ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          position: 'relative',
          transition: 'border-color 0.15s',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Chargement…' : (selected?.label ?? placeholder)}
        </span>
        {selected?.tag && (
          <span style={{
            fontSize: '10px', padding: '1px 5px', flexShrink: 0,
            background: 'var(--ac-bg)', color: 'var(--ac-tx)',
            border: '1px solid var(--ac-bd)', borderRadius: '3px',
          }}>
            {selected.tag}
          </span>
        )}
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          stroke="var(--tx-2)" strokeWidth="1.5" strokeLinecap="round"
          style={{
            position: 'absolute', right: '10px', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s',
          }}
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0, right: 0,
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          zIndex: 200,
          maxHeight: '200px',
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {options.length === 0
            ? (
              <div style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--tx-2)' }}>
                Aucun élément disponible
              </div>
            )
            : options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  width: '100%',
                  background: value === opt.value ? 'var(--ac-bg)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    color: value === opt.value ? 'var(--ac-tx)' : 'var(--tx-0)',
                    fontWeight: value === opt.value ? 500 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {opt.label}
                  </div>
                  {opt.sublabel && (
                    <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '1px' }}>
                      {opt.sublabel}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {opt.tag && (
                    <span style={{
                      fontSize: '10px', padding: '1px 5px',
                      background: 'var(--ac-bg)', color: 'var(--ac-tx)',
                      border: '1px solid var(--ac-bd)', borderRadius: '3px',
                    }}>
                      {opt.tag}
                    </span>
                  )}
                  {value === opt.value && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                      stroke="var(--ac)" strokeWidth="2.5">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </div>
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ─── Résumé preset ────────────────────────────────────────────────────────────

function PresetSummary({ preset }: { preset: PresetRead }) {
  const totalViews =
    Math.ceil(360 / preset.angular_step_deg) * preset.rings * preset.focus_planes

  const items = [
    { label: 'Anneaux',       value: String(preset.rings) },
    { label: 'Pas angulaire', value: `${preset.angular_step_deg}°` },
    { label: 'Plans focus',   value: String(preset.focus_planes) },
    { label: 'Stacking',      value: preset.stack_mode },
    { label: 'Niveau',        value: preset.tier },
    { label: 'Vues estimées', value: totalViews.toLocaleString('fr-FR'), highlight: true },
  ]

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      marginTop: '6px',
      marginBottom: '16px',
    }}>
      <div style={{
        fontSize: '10px', color: 'var(--tx-2)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: '10px',
      }}>
        Résumé du preset
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 8px' }}>
        {items.map(({ label, value, highlight }) => (
          <div key={label}>
            <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginBottom: '2px' }}>
              {label}
            </div>
            <div style={{
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              color: highlight ? 'var(--ac-tx)' : 'var(--tx-0)',
              fontWeight: highlight ? 500 : 400,
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {totalViews > 3000 && (
        <div style={{
          marginTop: '10px', paddingTop: '8px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', color: 'var(--wn)',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
            <path d="M6 1.5L11 10.5H1L6 1.5z" />
            <line x1="6" y1="5" x2="6" y2="8" />
            <circle cx="6" cy="9.5" r="0.6" fill="currentColor" />
          </svg>
          Session longue — durée estimée ~{Math.round(totalViews / 60 * 1.2)} min
        </div>
      )}
    </div>
  )
}

// ─── Modal principale ─────────────────────────────────────────────────────────

interface NewSessionModalProps {
  onClose: () => void
  onCreated?: (sessionId: string) => void
}

export function NewSessionModal({ onClose, onCreated }: NewSessionModalProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [specimenId, setSpecimenId] = useState('')
  const [presetId, setPresetId] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: specimens = [], isLoading: loadingSpecimens } = useQuery({
    queryKey: ['specimens'],
    queryFn: () => specimensApi.list({ limit: 200 }),
  })

  const { data: presets = [], isLoading: loadingPresets } = useQuery({
    queryKey: ['presets'],
    queryFn: () => presetsApi.list(),
  })

  const mutation = useMutation({
    mutationFn: (payload: SessionCreate) => sessionsApi.create(payload),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onCreated?.(session.id as string)
      onClose()
    },
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!specimenId) e.specimenId = 'Sélectionner un spécimen'
    if (!presetId) e.presetId = 'Sélectionner un preset'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    mutation.mutate({
      name: name.trim() || undefined,
      specimen_id: specimenId,
      preset_id: presetId,
    } as SessionCreate)
  }

  const specimenOptions: SelectOption[] = specimens.map((s: SpecimenRead) => ({
    value: s.id as string,
    label: s.external_id ?? `Spécimen ${(s.id as string).slice(0, 8)}`,
    sublabel: [s.category, s.size_mm ? `${s.size_mm} mm` : null].filter(Boolean).join(' · '),
  }))

  const presetOptions: SelectOption[] = presets.map((p: PresetRead) => ({
    value: p.id as string,
    label: p.name,
    sublabel: `${p.rings} anneaux · ${p.angular_step_deg}° · ${p.focus_planes} plans`,
    tag: p.is_system ? 'Système' : undefined,
  }))

  const selectedPreset = presets.find((p: PresetRead) => (p.id as string) === presetId)

  return (
    <Modal
      title="Nouvelle session de scan"
      onClose={onClose}
      width={520}
      footer={
        <>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <BtnPrimary
            onClick={handleSubmit}
            loading={mutation.isPending}
            disabled={loadingSpecimens || loadingPresets}
          >
            Créer la session
          </BtnPrimary>
        </>
      }
    >
      {/* Erreur API */}
      {mutation.isError && (
        <div style={{
          background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
          borderRadius: 'var(--radius-md)', padding: '9px 12px',
          marginBottom: '18px', fontSize: '11px', color: 'var(--er)',
          display: 'flex', alignItems: 'center', gap: '7px',
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="5.5" />
            <line x1="6.5" y1="4" x2="6.5" y2="7.5" />
            <circle cx="6.5" cy="9.5" r="0.7" fill="currentColor" />
          </svg>
          {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la création'}
        </div>
      )}

      <FormField label="Nom de la session" hint="Optionnel — si vide, un identifiant automatique sera utilisé">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex : Carabus auratus — lot 3"
          maxLength={200}
          autoFocus
        />
      </FormField>

      <FormField label="Spécimen" required error={errors.specimenId}>
        <CustomSelect
          options={specimenOptions}
          value={specimenId}
          onChange={(v) => { setSpecimenId(v); setErrors((p) => ({ ...p, specimenId: '' })) }}
          placeholder="Sélectionner un spécimen"
          loading={loadingSpecimens}
          error={!!errors.specimenId}
        />
        {specimens.length === 0 && !loadingSpecimens && (
          <div style={{
            fontSize: '11px', color: 'var(--wn)', marginTop: '5px',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5.5 1L10.5 10H.5L5.5 1z" />
              <line x1="5.5" y1="4.5" x2="5.5" y2="7" />
              <circle cx="5.5" cy="8.5" r="0.5" fill="currentColor" />
            </svg>
            Aucun spécimen — en créer un depuis la page Spécimens d'abord
          </div>
        )}
      </FormField>

      <FormField label="Preset de capture" required error={errors.presetId}>
        <CustomSelect
          options={presetOptions}
          value={presetId}
          onChange={(v) => { setPresetId(v); setErrors((p) => ({ ...p, presetId: '' })) }}
          placeholder="Sélectionner un preset"
          loading={loadingPresets}
          error={!!errors.presetId}
        />
      </FormField>

      {selectedPreset && <PresetSummary preset={selectedPreset} />}

      <FormField label="Notes" hint="Optionnel — conditions de capture, état du spécimen…">
        <TextareaInput
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Conditions de lumière, état du spécimen, remarques…"
          rows={3}
        />
      </FormField>
    </Modal>
  )
}