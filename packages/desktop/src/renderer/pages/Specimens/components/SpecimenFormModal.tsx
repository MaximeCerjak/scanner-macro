import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, FormField, TextInput, TextareaInput, BtnPrimary, BtnSecondary } from '../../../components/ui/Modal'
import { ImageCropModal } from '../../../components/ui/ImageCropModal'
import { specimensApi } from '../../../api/client'
import type { SpecimenRead, SpecimenCreate } from '../../../api/client'

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
  { value: 'point_mounted', label: 'Monté sur pointe'  },
  { value: 'special_mount', label: 'Montage spécial'   },
  { value: 'free',          label: 'Libre'             },
]

function SegmentedSelect({
  options, value, onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'var(--bg-0)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--tx-0)',
        fontSize: '12px',
        padding: '7px 28px 7px 10px',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239b9990' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        outline: 'none',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

interface SpecimenFormModalProps {
  specimen?: SpecimenRead
  onClose: () => void
  onSaved?: () => void
}

export function SpecimenFormModal({ specimen, onClose, onSaved }: SpecimenFormModalProps) {
  const queryClient  = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit       = !!specimen

  // ── État formulaire ─────────────────────────────────────────────────────────
  // Priorité : name (nouveau champ) > external_id (legacy) > vide
  const [name,       setName]       = useState(specimen?.name ?? specimen?.external_id ?? '')
  const [externalId, setExternalId] = useState(specimen?.external_id ?? '')
  const [category,   setCategory]   = useState<string>(specimen?.category   ?? 'insect')
  const [pinStatus,  setPinStatus]  = useState<string>(specimen?.pin_status ?? 'pinned')
  const [sizeMm,     setSizeMm]     = useState(specimen?.size_mm != null ? String(specimen.size_mm) : '')
  const [notes,      setNotes]      = useState(specimen?.notes ?? '')
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  // ── Photo ───────────────────────────────────────────────────────────────────
  const [pendingFile,  setPendingFile]  = useState<File | null>(null)
  const [thumbnail,    setThumbnail]    = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Reset complet si specimen change
  useEffect(() => {
    setName(specimen?.name ?? specimen?.external_id ?? '')
    setExternalId(specimen?.external_id ?? '')
    setCategory(specimen?.category   ?? 'insect')
    setPinStatus(specimen?.pin_status ?? 'pinned')
    setSizeMm(specimen?.size_mm != null ? String(specimen.size_mm) : '')
    setNotes(specimen?.notes ?? '')
    setErrors({})
    setThumbnail(null)
    setPendingFile(null)
    setPreviewUrl(null)
    if (!specimen?.thumbnail_key) return
    specimensApi.getThumbnailUrl(String(specimen.id))
        .then(setPreviewUrl)
        .catch(() => {})
  }, [specimen])

  // ── Mutation save ───────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async (payload: SpecimenCreate) => {
      const saved = isEdit
        ? await specimensApi.update(String(specimen!.id), payload)
        : await specimensApi.create(payload)

      // Upload thumbnail si une nouvelle image a été choisie
      if (thumbnail) {
        await specimensApi.uploadThumbnail(String(saved.id), thumbnail)
      }
      return saved
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['specimens'] })
      onSaved?.()
      onClose()
    },
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Le nom est requis'
    if (sizeMm && isNaN(parseFloat(sizeMm))) e.sizeMm = 'Valeur numérique attendue'
    if (sizeMm && parseFloat(sizeMm) <= 0)   e.sizeMm = 'La taille doit être positive'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    mutation.mutate({
      name:        name.trim(),
      external_id: externalId.trim() || undefined,
      category:    category  as SpecimenCreate['category'],
      pin_status:  pinStatus as SpecimenCreate['pin_status'],
      size_mm:     sizeMm ? parseFloat(sizeMm) : undefined,
      notes:       notes.trim() || undefined,
    } as SpecimenCreate)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    e.target.value = ''
  }

  return (
    <>
      {/* Crop modal — par-dessus la modale specimen */}
      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onConfirm={(cropped) => {
            setThumbnail(cropped)
            setPreviewUrl(URL.createObjectURL(cropped))
            setPendingFile(null)
          }}
          onCancel={() => setPendingFile(null)}
        />
      )}

      <Modal
        title={isEdit
          ? `Modifier — ${specimen!.name ?? specimen!.external_id ?? 'Spécimen'}`
          : 'Nouveau spécimen'}
        onClose={onClose}
        width={500}
        footer={
          <>
            <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
            <BtnPrimary onClick={handleSubmit} loading={mutation.isPending}>
              {isEdit ? 'Enregistrer' : 'Créer le spécimen'}
            </BtnPrimary>
          </>
        }
      >
        {/* Erreur API */}
        {mutation.isError && (
          <div style={{
            background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
            borderRadius: 'var(--radius-md)', padding: '9px 12px',
            marginBottom: '16px', fontSize: '11px', color: 'var(--er)',
            display: 'flex', alignItems: 'center', gap: '7px',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6.5" cy="6.5" r="5.5" />
              <line x1="6.5" y1="4" x2="6.5" y2="7.5" />
              <circle cx="6.5" cy="9.5" r="0.7" fill="currentColor" />
            </svg>
            {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la sauvegarde'}
          </div>
        )}

        {/* Zone photo + nom — côte à côte */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
          {/* Photo */}
          <div style={{ flexShrink: 0 }}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png"
              hidden onChange={handleFileSelect} />
            <div
              onClick={() => fileInputRef.current?.click()}
              title="Cliquer pour changer la photo"
              style={{
                width: '88px', height: '88px',
                borderRadius: 'var(--radius-lg)',
                border: previewUrl
                  ? '2px solid var(--ac-bd)'
                  : '2px dashed var(--border-2)',
                background: 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer',
                transition: 'border-color 0.15s', position: 'relative',
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                  stroke="var(--tx-2)" strokeWidth="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="17.5" cy="8" r="1" fill="var(--tx-2)" stroke="none" />
                </svg>
              )}
              {/* Overlay "changer" au hover */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                  stroke="#fff" strokeWidth="1.5">
                  <path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z" />
                </svg>
              </div>
            </div>
            {previewUrl && (
              <button
                type="button"
                onClick={() => { setThumbnail(null); setPreviewUrl(null) }}
                style={{
                  display: 'block', width: '100%', marginTop: '4px',
                  fontSize: '10px', color: 'var(--tx-2)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'center', padding: '2px 0',
                }}
              >
                Retirer
              </button>
            )}
          </div>

          {/* Nom */}
          <div style={{ flex: 1 }}>
            <FormField label="Nom" required error={errors.name}
              hint="Nom de terrain ou nom scientifique">
              <TextInput
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })) }}
                placeholder="ex : Carabus auratus"
                maxLength={200}
                autoFocus
              />
            </FormField>

            <FormField label="Réf. collection" hint="Code MNHN, numéro lot…">
              <TextInput
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="ex : MNHN-2024-001"
                maxLength={128}
              />
            </FormField>
          </div>
        </div>

        {/* Catégorie + montage */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Catégorie">
            <SegmentedSelect options={CATEGORIES} value={category} onChange={setCategory} />
          </FormField>
          <FormField label="Montage">
            <SegmentedSelect options={PIN_STATUSES} value={pinStatus} onChange={setPinStatus} />
          </FormField>
        </div>

        {/* Taille */}
        <FormField label="Taille estimée" error={errors.sizeMm}
          hint="En millimètres — utilisé pour recommander un preset adapté">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              value={sizeMm}
              onChange={(e) => { setSizeMm(e.target.value); setErrors((p) => ({ ...p, sizeMm: '' })) }}
              placeholder="ex : 12"
              min="0.1"
              step="0.5"
              style={{
                flex: 1,
                background: 'var(--bg-0)',
                border: `1px solid ${errors.sizeMm ? 'var(--er-bd)' : 'var(--border-2)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--tx-0)',
                fontSize: '12px',
                padding: '7px 10px',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--tx-2)', flexShrink: 0 }}>mm</span>
          </div>
        </FormField>

        {/* Notes */}
        <FormField label="Notes" hint="Optionnel — état de conservation, provenance, remarques…">
          <TextareaInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="État de conservation, lieu de collecte, taxonomie détaillée…"
            rows={3}
          />
        </FormField>
      </Modal>
    </>
  )
}