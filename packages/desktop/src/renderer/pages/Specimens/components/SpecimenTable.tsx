import { useRef, useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SpecimenRead } from '../../../api/client'
import { specimensApi } from '../../../api/client'

const CATEGORY_LABELS: Record<string, string> = {
  insect:          'Insecte',
  arachnid:        'Arachnide',
  other_arthropod: 'Autre arthropode',
  mineral:         'Minéral',
  jewel:           'Bijou',
  watchmaking:     'Horlogerie',
  miniature:       'Miniature',
  artifact:        'Artéfact',
  other:           'Autre',
}

const PIN_LABELS: Record<string, string> = {
  pinned:        'Épinglé',
  point_mounted: 'Sur pointe',
  special_mount: 'Spécial',
  free:          'Libre',
}

// ─── Thumbnail upload inline ──────────────────────────────────────────────────

function SpecimenThumb({ specimen }: { specimen: SpecimenRead }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  // Charger l'URL présignée
  useEffect(() => {
    if (!specimen.thumbnail_key) { setThumbUrl(null); return }
    specimensApi.getThumbnailUrl(String(specimen.id))
      .then(setThumbUrl)
      .catch(() => setThumbUrl(null))
  }, [specimen.id, specimen.thumbnail_key])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => specimensApi.uploadThumbnail(String(specimen.id), file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['specimens'] })
    },
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        onClick={() => inputRef.current?.click()}
        title={thumbUrl ? 'Cliquer pour changer' : 'Cliquer pour ajouter une image'}
        style={{
          width: '32px', height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : uploadMutation.isPending ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="var(--tx-2)" strokeWidth="2"
            style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M6 1a5 5 0 010 10" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="var(--tx-2)" strokeWidth="1.5">
            <rect x="1.5" y="2.5" width="9" height="7" rx="1" />
            <circle cx="6" cy="6" r="1.5" />
          </svg>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) uploadMutation.mutate(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface SpecimenTableProps {
  specimens: SpecimenRead[]
  selectedId: string | null
  onSelect: (id: string) => void
  onEdit: (specimen: SpecimenRead) => void
  onDelete: (specimen: SpecimenRead) => void
}

export function SpecimenTable({
  specimens, selectedId, onSelect, onEdit, onDelete,
}: SpecimenTableProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '6%' }} />   {/* Thumbnail */}
          <col style={{ width: '28%' }} />  {/* Nom */}
          <col style={{ width: '16%' }} />  {/* Catégorie */}
          <col style={{ width: '13%' }} />  {/* Montage */}
          <col style={{ width: '9%' }} />   {/* Taille */}
          <col style={{ width: '15%' }} />  {/* Créé le */}
          <col style={{ width: '13%' }} />  {/* Actions */}
        </colgroup>
        <thead>
          <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
            {['', 'Nom', 'Catégorie', 'Montage', 'Taille', 'Créé le', ''].map((h, i) => (
              <th key={i} style={{
                padding: '7px 12px', textAlign: 'left',
                fontSize: '10px', fontWeight: 500,
                color: 'var(--tx-2)', textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specimens.map((s) => {
            const isSelected = selectedId === String(s.id)
            return (
              <tr
                key={String(s.id)}
                onClick={() => onSelect(String(s.id))}
                style={{
                  background: isSelected ? 'var(--ac-bg)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'default', transition: 'background 0.1s',
                }}
              >
                {/* Thumbnail */}
                <td style={{ padding: '6px 8px 6px 12px' }}
                  onClick={(e) => e.stopPropagation()}>
                  <SpecimenThumb specimen={s} />
                </td>

                {/* Nom — priorité name, fallback external_id */}
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 500,
                    color: isSelected ? 'var(--ac-tx)' : 'var(--tx-0)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', display: 'block',
                  }}>
                    {s.name ?? s.external_id ?? `Spécimen ${String(s.id).slice(0, 8)}`}
                  </span>
                  {s.notes && (
                    <span style={{
                      fontSize: '10px', color: 'var(--tx-2)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', display: 'block', marginTop: '1px',
                    }}>
                      {s.notes}
                    </span>
                  )}
                </td>

                {/* Catégorie */}
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--tx-1)' }}>
                    {CATEGORY_LABELS[s.category] ?? s.category}
                  </span>
                </td>

                {/* Montage */}
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>
                    {PIN_LABELS[s.pin_status] ?? s.pin_status}
                  </span>
                </td>

                {/* Taille */}
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)',
                    color: s.size_mm ? 'var(--tx-0)' : 'var(--tx-2)' }}>
                    {s.size_mm != null ? `${s.size_mm}mm` : '—'}
                  </span>
                </td>

                {/* Créé le */}
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(s.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(s) }}
                      title="Modifier"
                      style={{ background: 'none', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        padding: '3px 6px', color: 'var(--tx-2)',
                        display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                        stroke="currentColor" strokeWidth="1.5">
                        <path d="M8.5 1.5l2 2L4 10H2v-2L8.5 1.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(s) }}
                      title="Supprimer"
                      style={{ background: 'none', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        padding: '3px 6px', color: 'var(--tx-2)',
                        display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                        stroke="currentColor" strokeWidth="1.5">
                        <polyline points="2,3 10,3" />
                        <path d="M4 3V2h4v1" />
                        <path d="M3 3l.5 7h5L9 3" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}