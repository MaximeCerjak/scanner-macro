import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal, FormField, TextInput, BtnPrimary, BtnSecondary } from './Modal'
import { ImageCropModal } from './ImageCropModal'
import { sessionsApi, specimensApi, presetsApi } from '../../api/client'
import type { SessionCreate, SpecimenRead, PresetRead } from '../../api/client'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'insect',          label: 'Insecte'          },
  { value: 'arachnid',        label: 'Arachnide'        },
  { value: 'other_arthropod', label: 'Autre arthropode' },
  { value: 'mineral',         label: 'Minéral'          },
  { value: 'jewel',           label: 'Bijou'            },
  { value: 'watchmaking',     label: 'Horlogerie'       },
  { value: 'miniature',       label: 'Miniature'        },
  { value: 'artifact',        label: 'Artéfact'         },
  { value: 'other',           label: 'Autre'            },
]

const PIN_STATUSES: { value: string; label: string }[] = [
  { value: 'pinned',        label: 'Épinglé'          },
  { value: 'point_mounted', label: 'Sur pointe'        },
  { value: 'special_mount', label: 'Montage spécial'   },
  { value: 'free',          label: 'Libre'             },
]

function PresetSelect({ presets, value, onChange, loading, error }: {
  presets: PresetRead[]; value: string; onChange: (v: string) => void; loading: boolean; error?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = presets.find((p) => p.id === value)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => !loading && setOpen((o) => !o)} style={{
        width: '100%', background: 'var(--bg-0)', textAlign: 'left',
        border: `1px solid ${error ? 'var(--er-bd)' : open ? 'var(--ac-bd)' : 'var(--border-2)'}`,
        borderRadius: 'var(--radius-md)', color: selected ? 'var(--tx-0)' : 'var(--tx-2)',
        fontSize: '12px', padding: '7px 32px 7px 10px', cursor: loading ? 'not-allowed' : 'pointer',
        outline: 'none', display: 'flex', alignItems: 'center', gap: '8px',
        transition: 'border-color 0.15s', position: 'relative',
      }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Chargement…' : (selected?.name ?? 'Sélectionner un preset')}
        </span>
        {selected?.is_system && (
          <span style={{ fontSize: '10px', padding: '1px 5px', flexShrink: 0,
            background: 'var(--ac-bg)', color: 'var(--ac-tx)', border: '1px solid var(--ac-bd)', borderRadius: '3px' }}>
            Système
          </span>
        )}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="var(--tx-2)" strokeWidth="1.5" strokeLinecap="round"
          style={{ position: 'absolute', right: '10px', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          zIndex: 200, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {presets.map((p) => (
            <button key={p.id} type="button" onClick={() => { onChange(p.id); setOpen(false) }}
              style={{ width: '100%', background: value === p.id ? 'var(--ac-bg)' : 'transparent',
                border: 'none', borderBottom: '1px solid var(--border)', padding: '8px 12px',
                cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: value === p.id ? 'var(--ac-tx)' : 'var(--tx-0)', fontWeight: value === p.id ? 500 : 400 }}>{p.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '1px' }}>{p.rings} anneaux · {p.angular_step_deg}° · {p.focus_planes} plans</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {p.is_system && <span style={{ fontSize: '10px', padding: '1px 5px', background: 'var(--ac-bg)', color: 'var(--ac-tx)', border: '1px solid var(--ac-bd)', borderRadius: '3px' }}>Système</span>}
                {value === p.id && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--ac)" strokeWidth="2.5"><polyline points="2,6 5,9 10,3" /></svg>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PresetSummary({ preset }: { preset: PresetRead }) {
  const totalViews = Math.ceil(360 / preset.angular_step_deg) * preset.rings * preset.focus_planes
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginTop: '6px', marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: 'var(--tx-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Résumé du preset</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 8px' }}>
        {[
          { label: 'Anneaux', value: String(preset.rings) },
          { label: 'Pas angulaire', value: `${preset.angular_step_deg}°` },
          { label: 'Plans focus', value: String(preset.focus_planes) },
          { label: 'Stacking', value: preset.stack_mode },
          { label: 'Niveau', value: preset.tier },
          { label: 'Vues estimées', value: totalViews.toLocaleString('fr-FR'), highlight: true },
        ].map(({ label, value, highlight }) => (
          <div key={label}>
            <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: highlight ? 'var(--ac-tx)' : 'var(--tx-0)', fontWeight: highlight ? 500 : 400 }}>{value}</div>
          </div>
        ))}
      </div>
      {totalViews > 3000 && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--wn)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}><path d="M6 1.5L11 10.5H1L6 1.5z" /><line x1="6" y1="5" x2="6" y2="8" /><circle cx="6" cy="9.5" r="0.6" fill="currentColor" /></svg>
          Session longue — durée estimée ~{Math.round(totalViews / 60 * 1.2)} min
        </div>
      )}
    </div>
  )
}

function SpecimenAutocomplete({ value, category, onChange, error }: {
  value: string; category: string; onChange: (value: string) => void; error?: string
}) {
  const [suggestions, setSuggestions] = useState<SpecimenRead[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await specimensApi.search(q.trim(), category || undefined)
        setSuggestions(results)
        setShowSuggestions(true)
        setIsNew(!results.find((s) => (s.name ?? '').toLowerCase() === q.trim().toLowerCase()) && q.trim().length > 0)
      } catch { setSuggestions([]) }
    }, 250)
  }, [category])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input type="text" value={value}
          onChange={(e) => { onChange(e.target.value); search(e.target.value) }}
          onFocus={() => value.length >= 2 && setShowSuggestions(suggestions.length > 0)}
          placeholder="ex : Carabus auratus, scarabée vert…"
          autoFocus
          style={{
            width: '100%', background: 'var(--bg-0)',
            border: `1px solid ${error ? 'var(--er-bd)' : 'var(--border-2)'}`,
            borderRadius: 'var(--radius-md)', color: 'var(--tx-0)',
            fontSize: '12px', padding: '7px 36px 7px 10px', outline: 'none', fontFamily: 'var(--font-sans)',
          }} />
        {isNew && value.trim().length >= 2 && (
          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '10px', padding: '1px 6px', borderRadius: '3px',
            background: 'var(--ok-bg)', color: 'var(--ok)', border: '1px solid var(--ok-bd)' }}>
            Nouveau
          </span>
        )}
      </div>
      {value.trim().length >= 2 && isNew && <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '4px' }}>Un nouveau spécimen sera créé automatiquement</div>}
      {value.trim().length >= 2 && !isNew && suggestions.length > 0 && <div style={{ fontSize: '10px', color: 'var(--ac-tx)', marginTop: '4px' }}>Spécimen existant sélectionné</div>}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', zIndex: 200, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {suggestions.map((s) => (
            <button key={String(s.id)} type="button"
              onClick={() => { onChange(s.name ?? ''); setSuggestions([]); setShowSuggestions(false); setIsNew(false) }}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '8px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--tx-0)' }}>{s.name ?? s.external_id ?? `Spécimen ${String(s.id).slice(0, 8)}`}</div>
                <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '1px' }}>{[s.category, s.size_mm ? `${s.size_mm} mm` : null].filter(Boolean).join(' · ')}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--ac)" strokeWidth="1.5" style={{ flexShrink: 0, opacity: 0.6 }}><polyline points="2,6 5,9 10,3" /></svg>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface NewSessionModalProps {
  onClose: () => void
  onCreated?: (sessionId: string) => void
}

export function NewSessionModal({ onClose, onCreated }: NewSessionModalProps) {
  const queryClient = useQueryClient()

  const [sessionName,       setSessionName]      = useState('')
  const [specimenName,      setSpecimenName]      = useState('')
  const [specimenCategory,  setSpecimenCategory]  = useState('insect')
  const [presetId,          setPresetId]          = useState('')
  const [errors,            setErrors]            = useState<Record<string, string>>({})
  const [pendingFile,       setPendingFile]       = useState<File | null>(null)
  const [thumbnail,         setThumbnail]         = useState<File | null>(null)
  const [previewUrl,        setPreviewUrl]        = useState<string | null>(null)
  const [showDetails,       setShowDetails]       = useState(false)
  const [specimenSize,      setSpecimenSize]      = useState('')
  const [pinStatus,         setPinStatus]         = useState('pinned')
  const [specimenNotes,     setSpecimenNotes]     = useState('')

  const { data: presets = [], isLoading: loadingPresets } = useQuery({
    queryKey: ['presets'],
    queryFn:  () => presetsApi.list(),
  })

  const mutation = useMutation({
    mutationFn: async ({ payload, thumb }: { payload: SessionCreate; thumb?: File }) =>
      sessionsApi.create(payload, thumb),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] })
      void queryClient.invalidateQueries({ queryKey: ['specimens'] })
      onCreated?.(session.id)
      onClose()
    },
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!specimenName.trim()) e.specimenName = 'Saisir un nom de spécimen'
    if (!presetId)            e.presetId     = 'Sélectionner un preset'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    mutation.mutate({
      payload: {
        name:                sessionName.trim() || undefined,
        preset_id:           presetId,
        specimen_name:       specimenName.trim(),
        specimen_category:   specimenCategory as SessionCreate['specimen_category'],
        specimen_size_mm:    specimenSize ? parseFloat(specimenSize) : undefined,
        specimen_pin_status: showDetails ? pinStatus : undefined,
        specimen_notes:      showDetails && specimenNotes.trim() ? specimenNotes.trim() : undefined,
      } as SessionCreate,
      thumb: thumbnail ?? undefined,
    })
  }

  const selectedPreset = presets.find((p: PresetRead) => p.id === presetId)
  const hasDetails = !!(specimenSize || specimenNotes)

  return (
    <>
      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onConfirm={(cropped) => { setThumbnail(cropped); setPreviewUrl(URL.createObjectURL(cropped)); setPendingFile(null) }}
          onCancel={() => setPendingFile(null)}
        />
      )}

      <Modal title="Nouveau scan" onClose={onClose} width={520}
        footer={
          <>
            <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
            <BtnPrimary onClick={handleSubmit} loading={mutation.isPending}>Lancer le scan</BtnPrimary>
          </>
        }>

        {mutation.isError && (
          <div style={{ background: 'var(--er-bg)', border: '1px solid var(--er-bd)', borderRadius: 'var(--radius-md)', padding: '9px 12px', marginBottom: '16px', fontSize: '11px', color: 'var(--er)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="5.5" /><line x1="6.5" y1="4" x2="6.5" y2="7.5" /><circle cx="6.5" cy="9.5" r="0.7" fill="currentColor" /></svg>
            {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la création'}
          </div>
        )}

        {/* Photo + nom */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <label style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-lg)',
                border: previewUrl ? '2px solid var(--ac-bd)' : '2px dashed var(--border-2)',
                background: 'var(--bg-2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}>
                {previewUrl
                  ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tx-2)" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><circle cx="17.5" cy="8" r="1" fill="var(--tx-2)" stroke="none" /></svg>
                }
              </div>
              <input type="file" accept="image/jpeg,image/png" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); e.target.value = '' } }} />
            </label>
            {previewUrl
              ? <button type="button" onClick={() => { setThumbnail(null); setPreviewUrl(null) }}
                  style={{ display: 'block', width: '100%', marginTop: '3px', fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '2px 0' }}>Retirer</button>
              : <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '3px', textAlign: 'center', width: '80px' }}>Photo<br/>optionnelle</div>
            }
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Spécimen" required error={errors.specimenName} hint="Spécimen existant ou nouveau créé automatiquement">
              <SpecimenAutocomplete
                value={specimenName}
                category={specimenCategory}
                onChange={(v) => { setSpecimenName(v); setErrors((p) => ({ ...p, specimenName: '' })) }}
                error={errors.specimenName}
              />
            </FormField>
          </div>
        </div>

        {/* Catégorie */}
        <FormField label="Catégorie">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {CATEGORIES.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => setSpecimenCategory(value)}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--radius-md)',
                  border: specimenCategory === value ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
                  background: specimenCategory === value ? 'var(--ac-bg)' : 'var(--bg-2)',
                  color: specimenCategory === value ? 'var(--ac-tx)' : 'var(--tx-1)',
                  cursor: 'pointer', transition: 'all 0.1s' }}>
                {label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Preset */}
        <FormField label="Preset de capture" required error={errors.presetId}>
          <PresetSelect presets={presets} value={presetId}
            onChange={(v) => { setPresetId(v); setErrors((p) => ({ ...p, presetId: '' })) }}
            loading={loadingPresets} error={!!errors.presetId} />
        </FormField>
        {selectedPreset && <PresetSummary preset={selectedPreset} />}

        {/* Détails spécimen repliables */}
        <div style={{ marginBottom: '16px' }}>
          <button type="button" onClick={() => setShowDetails((v) => !v)}
            style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: showDetails ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
              padding: '8px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tx-1)' }}>
              Détails du spécimen
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {hasDetails && (
                <span style={{ fontSize: '10px', color: 'var(--ac-tx)', background: 'var(--ac-bg)',
                  border: '1px solid var(--ac-bd)', borderRadius: '3px', padding: '1px 6px' }}>
                  renseigné
                </span>
              )}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="var(--tx-2)"
                strokeWidth="1.5" strokeLinecap="round"
                style={{ transition: 'transform 0.2s', transform: showDetails ? 'rotate(180deg)' : 'rotate(0)' }}>
                <path d="M1 1l4 4 4-4" />
              </svg>
            </div>
          </button>

          {showDetails && (
            <div style={{ border: '1px solid var(--border)', borderTop: 'none',
              borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              padding: '14px 14px 6px', background: 'var(--bg-1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Taille estimée" hint="En millimètres">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="number" value={specimenSize} onChange={(e) => setSpecimenSize(e.target.value)}
                      placeholder="ex : 12" min="0.1" step="0.5"
                      style={{ flex: 1, background: 'var(--bg-0)', border: '1px solid var(--border-2)',
                        borderRadius: 'var(--radius-md)', color: 'var(--tx-0)',
                        fontSize: '12px', padding: '7px 10px', outline: 'none', fontFamily: 'var(--font-sans)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--tx-2)', flexShrink: 0 }}>mm</span>
                  </div>
                </FormField>
                <FormField label="Montage">
                  <select value={pinStatus} onChange={(e) => setPinStatus(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border-2)',
                      borderRadius: 'var(--radius-md)', color: 'var(--tx-0)', fontSize: '12px',
                      padding: '7px 28px 7px 10px', cursor: 'pointer', appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239b9990' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                      outline: 'none', fontFamily: 'var(--font-sans)' }}>
                    {PIN_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Notes" hint="État de conservation, provenance…">
                <textarea value={specimenNotes} onChange={(e) => setSpecimenNotes(e.target.value)}
                  placeholder="Lieu de collecte, état, taxonomie…" rows={2}
                  style={{ width: '100%', background: 'var(--bg-0)', border: '1px solid var(--border-2)',
                    borderRadius: 'var(--radius-md)', color: 'var(--tx-0)', fontSize: '12px',
                    padding: '7px 10px', outline: 'none', fontFamily: 'var(--font-sans)',
                    resize: 'vertical', lineHeight: '1.5' }} />
              </FormField>
            </div>
          )}
        </div>

        {/* Nom de session */}
        <FormField label="Nom de la session" hint="Optionnel — si vide, le nom du spécimen sera utilisé">
          <TextInput value={sessionName} onChange={(e) => setSessionName(e.target.value)}
            placeholder="ex : Lot A — éclairage diffus" maxLength={200} />
        </FormField>
      </Modal>
    </>
  )
}