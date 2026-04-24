import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, FormField, TextInput, BtnPrimary, BtnSecondary } from '../../../components/ui/Modal'
import { presetsApi } from '../../../api/client'
import type { PresetRead } from '../../../api/client'

interface DuplicateModalProps {
  preset: PresetRead
  onClose: () => void
  onCreated: (newPresetId: string) => void
}

export function DuplicateModal({ preset, onClose, onCreated }: DuplicateModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(`${preset.name} (copie)`)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => presetsApi.duplicate(String(preset.id), name.trim()),
    onSuccess: (newPreset) => {
      void queryClient.invalidateQueries({ queryKey: ['presets'] })
      onCreated(String(newPreset.id))
      onClose()
    },
  })

  function handleSubmit() {
    if (!name.trim()) { setError('Le nom est requis'); return }
    mutation.mutate()
  }

  return (
    <Modal
      title="Dupliquer le preset"
      onClose={onClose}
      width={400}
      footer={
        <>
          <BtnSecondary onClick={onClose}>Annuler</BtnSecondary>
          <BtnPrimary onClick={handleSubmit} loading={mutation.isPending}>
            Dupliquer
          </BtnPrimary>
        </>
      }
    >
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '10px 12px',
        marginBottom: '16px', fontSize: '11px', color: 'var(--tx-1)',
      }}>
        Copie de <strong style={{ color: 'var(--tx-0)' }}>{preset.name}</strong> — les paramètres seront identiques, modifiables ensuite.
      </div>

      {mutation.isError && (
        <div style={{
          background: 'var(--er-bg)', border: '1px solid var(--er-bd)',
          borderRadius: 'var(--radius-md)', padding: '9px 12px',
          marginBottom: '12px', fontSize: '11px', color: 'var(--er)',
        }}>
          {mutation.error instanceof Error ? mutation.error.message : 'Erreur lors de la duplication'}
        </div>
      )}

      <FormField label="Nom du nouveau preset" required error={error}>
        <TextInput
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          placeholder="ex : Standard modifié"
          maxLength={128}
          autoFocus
        />
      </FormField>
    </Modal>
  )
}