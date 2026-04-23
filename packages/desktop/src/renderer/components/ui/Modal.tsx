import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
  footer?: ReactNode
}

export function Modal({ title, onClose, children, width = 480, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    // Overlay — faux viewport pour éviter position:fixed
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{
        width,
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '80vh',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tx-0)' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--tx-2)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="2" y1="2" x2="13" y2="13" />
              <line x1="13" y1="2" x2="2" y2="13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Primitives de formulaire ─────────────────────────────────────────────────

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, required, error, children, hint }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--tx-1)',
        marginBottom: '5px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {label}
        {required && <span style={{ color: 'var(--er)', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontSize: '10px', color: 'var(--tx-2)', marginTop: '4px' }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{ fontSize: '10px', color: 'var(--er)', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-0)',
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--tx-0)',
  fontSize: '12px',
  padding: '7px 10px',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={inputBase} {...props} />
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={{
        ...inputBase,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239b9990' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '28px',
      }}
      {...props}
    />
  )
}

export function TextareaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      style={{ ...inputBase, resize: 'vertical', minHeight: '72px', lineHeight: '1.5' }}
      {...props}
    />
  )
}

// ─── Boutons modal ────────────────────────────────────────────────────────────

export function BtnPrimary({
  children, disabled, loading, onClick,
}: {
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled || loading ? 'var(--bg-3)' : 'var(--ac)',
        color: disabled || loading ? 'var(--tx-2)' : 'var(--bg-1)',
        fontSize: '12px', fontWeight: 500,
        padding: '6px 16px', borderRadius: 'var(--radius-md)',
        border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px',
        transition: 'background 0.15s',
      }}
    >
      {loading && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ animation: 'spin 0.8s linear infinite' }}>
          <path d="M6 1a5 5 0 010 10" />
        </svg>
      )}
      {children}
    </button>
  )
}

export function BtnSecondary({
  children, onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-2)',
        color: 'var(--tx-1)',
        fontSize: '12px',
        padding: '6px 16px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}