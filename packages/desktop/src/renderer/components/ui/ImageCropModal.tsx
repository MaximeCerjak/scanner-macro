import { useState, useRef, useEffect, useCallback } from 'react'

interface ImageCropModalProps {
  file: File
  onConfirm: (croppedFile: File) => void
  onCancel: () => void
}

const OUTPUT_SIZE = 400
const CROP_SIZE   = 280
const CANVAS_W    = 520
const CANVAS_H    = 380

const BG_COLORS = [
  { label: 'Blanc',        value: '#ffffff' },
  { label: 'Noir',         value: '#111111' },
  { label: 'Gris clair',   value: '#e8e6e0' },
  { label: 'Gris foncé',   value: '#3a3a38' },
  { label: 'Beige',        value: '#f0ebe0' },
  { label: 'Bleu nuit',    value: '#1a2340' },
  { label: 'Vert forêt',   value: '#1c3020' },
  { label: 'Transparent',  value: 'transparent' },
]

export function ImageCropModal({ file, onConfirm, onCancel }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg]         = useState<HTMLImageElement | null>(null)
  const [imgState, setImgState] = useState({ x: 0, y: 0, scale: 1 })
  const [bgColor, setBgColor]   = useState('#ffffff')

  const dragRef         = useRef<{ startX: number; startY: number; startImgX: number; startImgY: number } | null>(null)
  const lastTouchRef    = useRef<{ x: number; y: number } | null>(null)

  const cropX = (CANVAS_W - CROP_SIZE) / 2
  const cropY = (CANVAS_H - CROP_SIZE) / 2

  // ── Charger l'image ──────────────────────────────────────────────────────────

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { setImg(image); URL.revokeObjectURL(url) }
    image.src = url
  }, [file])

  // ── Initialiser vue ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!img) return
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height, 1)
    setImgState({
      x: (CANVAS_W - img.width  * scale) / 2,
      y: (CANVAS_H - img.height * scale) / 2,
      scale,
    })
  }, [img])

  // ── Dessin ───────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Fond canvas
    ctx.fillStyle = '#1a1a18'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    const w = img.width  * imgState.scale
    const h = img.height * imgState.scale

    // Image
    ctx.drawImage(img, imgState.x, imgState.y, w, h)

    // Overlay sombre hors cadre
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Zone de crop : fond coloré d'abord, puis image par-dessus
    ctx.save()
    ctx.beginPath()
    ctx.rect(cropX, cropY, CROP_SIZE, CROP_SIZE)
    ctx.clip()

    // Fond de couleur (visible si l'image ne couvre pas tout le cadre)
    if (bgColor === 'transparent') {
      // Damier pour indiquer la transparence
      const sq = 10
      for (let row = 0; row * sq < CROP_SIZE; row++) {
        for (let col = 0; col * sq < CROP_SIZE; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#ccc' : '#fff'
          ctx.fillRect(cropX + col * sq, cropY + row * sq, sq, sq)
        }
      }
    } else {
      ctx.fillStyle = bgColor
      ctx.fillRect(cropX, cropY, CROP_SIZE, CROP_SIZE)
    }

    // Image dans le cadre
    ctx.drawImage(img, imgState.x, imgState.y, w, h)
    ctx.restore()

    // Bordure cadre
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth   = 2
    ctx.strokeRect(cropX, cropY, CROP_SIZE, CROP_SIZE)

    // Grille des tiers
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth   = 1
    const t = CROP_SIZE / 3
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(cropX + t * i, cropY); ctx.lineTo(cropX + t * i, cropY + CROP_SIZE); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cropX, cropY + t * i); ctx.lineTo(cropX + CROP_SIZE, cropY + t * i); ctx.stroke()
    }

    // Coins
    const c = 12
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth   = 3
    ;[
      [cropX,             cropY,             c,  0,  0,  c],
      [cropX + CROP_SIZE, cropY,            -c,  0,  0,  c],
      [cropX,             cropY + CROP_SIZE,  c,  0,  0, -c],
      [cropX + CROP_SIZE, cropY + CROP_SIZE, -c,  0,  0, -c],
    ].forEach(([x, y, dx1, _dy1, dx2, dy2]) => {
      ctx.beginPath()
      ctx.moveTo(x + dx1, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x + dx2, y + dy2)
      ctx.stroke()
    })
  }, [img, imgState, bgColor, cropX, cropY])

  useEffect(() => { draw() }, [draw])

  // ── Interactions ─────────────────────────────────────────────────────────────

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setImgState((prev) => {
      const newScale = Math.max(0.05, prev.scale * delta)
      const cx = CANVAS_W / 2
      const cy = CANVAS_H / 2
      return {
        scale: newScale,
        x: cx - (cx - prev.x) * (newScale / prev.scale),
        y: cy - (cy - prev.y) * (newScale / prev.scale),
      }
    })
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startImgX: imgState.x, startImgY: imgState.y }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    setImgState((prev) => ({
      ...prev,
      x: dragRef.current!.startImgX + (e.clientX - dragRef.current!.startX),
      y: dragRef.current!.startImgY + (e.clientY - dragRef.current!.startY),
    }))
  }

  function onMouseUp() { dragRef.current = null }

  function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 1)
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x
      const dy = e.touches[0].clientY - lastTouchRef.current.y
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setImgState((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
    }
  }

  function resetView() {
    if (!img) return
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height, 1)
    setImgState({ x: (CANVAS_W - img.width * scale) / 2, y: (CANVAS_H - img.height * scale) / 2, scale })
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  function handleConfirm() {
    if (!img) return
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width  = OUTPUT_SIZE
    exportCanvas.height = OUTPUT_SIZE
    const ctx = exportCanvas.getContext('2d')!

    // Fond de couleur
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    }

    const imgW = img.width  * imgState.scale
    const imgH = img.height * imgState.scale
    const relX = (cropX - imgState.x) / imgW
    const relY = (cropY - imgState.y) / imgH
    const relW = CROP_SIZE / imgW
    const relH = CROP_SIZE / imgH

    ctx.drawImage(
      img,
      relX * img.width, relY * img.height,
      relW * img.width, relH * img.height,
      0, 0, OUTPUT_SIZE, OUTPUT_SIZE
    )

    const mimeType = bgColor === 'transparent' ? 'image/png' : 'image/jpeg'
    const ext      = bgColor === 'transparent' ? 'png' : 'jpg'

    exportCanvas.toBlob((blob) => {
      if (!blob) return
      onConfirm(new File([blob], `thumbnail.${ext}`, { type: mimeType }))
    }, mimeType, 0.92)
  }

  if (!img) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 150,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: '#fff', fontSize: '12px' }}>Chargement…</div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 150,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        width: 'min(580px, 96vw)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '13px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--tx-0)' }}>
            Recadrer la photo
          </span>
          <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>
            Glisser · molette pour zoomer
          </span>
        </div>

        {/* Canvas */}
        <div style={{ background: '#1a1a18', display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ cursor: 'grab', display: 'block', maxWidth: '100%' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { lastTouchRef.current = null }}
          />
        </div>

        {/* Palette de fond */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-2)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--tx-2)', flexShrink: 0 }}>
            Fond
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {BG_COLORS.map(({ label, value }) => (
              <button
                key={value}
                title={label}
                onClick={() => setBgColor(value)}
                style={{
                  width: '22px', height: '22px',
                  borderRadius: '50%',
                  border: bgColor === value
                    ? '2px solid var(--ac)'
                    : '2px solid var(--border)',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  // Damier pour transparent
                  background: value === 'transparent'
                    ? 'conic-gradient(#ccc 90deg, #fff 90deg 180deg, #ccc 180deg 270deg, #fff 270deg) 0 0 / 10px 10px'
                    : value,
                  boxShadow: bgColor === value ? '0 0 0 1px var(--bg-1)' : 'none',
                  outline: 'none',
                  transition: 'border-color 0.1s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>
              {OUTPUT_SIZE}×{OUTPUT_SIZE}px
            </span>
            <button
              onClick={resetView}
              style={{
                fontSize: '11px', padding: '3px 8px',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--tx-1)',
              }}
            >
              Réinitialiser
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onCancel}
              style={{
                fontSize: '12px', padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--tx-1)',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              style={{
                fontSize: '12px', padding: '6px 16px', fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                background: 'var(--ac)', border: 'none',
                cursor: 'pointer', color: 'var(--bg-1)',
              }}
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}