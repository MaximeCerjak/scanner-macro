import { useState, useEffect, useRef } from 'react'
import { assetsApi } from '../../../api/client'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string
        alt?: string
        'camera-controls'?: boolean | string
        'auto-rotate'?: boolean | string
        'shadow-intensity'?: string
        'environment-image'?: string
        exposure?: string
        style?: React.CSSProperties
      }, HTMLElement>
    }
  }
}

export function ModelViewer({ assetId }: { assetId: string | null }) {
  const src = assetId ? assetsApi.downloadUrl(assetId) : null
  const [currentSrc, setCurrentSrc] = useState(src)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCurrentSrc(src)
    if (!assetId) return
    timer.current = setInterval(() => {
      setCurrentSrc(`${assetsApi.downloadUrl(assetId)}?t=${Date.now()}`)
    }, 12 * 60 * 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [assetId, src])

  if (!currentSrc) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '12px',
      }}>
        <svg width="52" height="52" viewBox="0 0 48 48" fill="none"
          stroke="var(--border-2)" strokeWidth="1.2" style={{ opacity: 0.4 }}>
          <circle cx="24" cy="24" r="18" />
          <circle cx="24" cy="24" r="7" />
          <circle cx="24" cy="24" r="1.5" fill="var(--border-2)" stroke="none" />
          <line x1="24" y1="4"  x2="24" y2="15" />
          <line x1="24" y1="33" x2="24" y2="44" />
          <line x1="4"  y1="24" x2="15" y2="24" />
          <line x1="33" y1="24" x2="44" y2="24" />
        </svg>
        <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>
          Aucun modèle 3D disponible — lancer le pipeline de traitement
        </span>
      </div>
    )
  }

  return (
    <model-viewer
      src={currentSrc}
      alt="Modèle 3D du spécimen"
      camera-controls
      shadow-intensity="0"
      environment-image="neutral"
      exposure="1.0"
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  )
}