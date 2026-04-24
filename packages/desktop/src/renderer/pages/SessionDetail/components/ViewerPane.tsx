import { useState } from 'react'
import type { SessionDetail, AssetRead } from '../../../api/client'
import { assetsApi } from '../../../api/client'
import { ModelViewer } from './ModelViewer'

type ViewerTab = '3d' | 'photos' | 'stacked' | 'mesh'

const VIEWER_TABS: { key: ViewerTab; label: string; icon: React.ReactNode }[] = [
  {
    key: '3d', label: 'Viewer 3D',
    icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1l5 3v4L6 11 1 8V4z" /></svg>,
  },
  {
    key: 'photos', label: 'Photos brutes',
    icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2.5" width="4" height="3" rx="0.5" /><rect x="7" y="2.5" width="4" height="3" rx="0.5" /><rect x="1" y="7" width="4" height="2.5" rx="0.5" /><rect x="7" y="7" width="4" height="2.5" rx="0.5" /></svg>,
  },
  {
    key: 'stacked', label: 'Focus stacked',
    icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="2.5" width="9" height="7" rx="1" /><line x1="1.5" y1="5.5" x2="10.5" y2="5.5" /></svg>,
  },
  {
    key: 'mesh', label: 'Mesh',
    icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="6,1 11,4 11,8.5 6,11 1,8.5 1,4" /></svg>,
  },
]

export function ViewerPane({ session, assets }: { session: SessionDetail; assets: AssetRead[] }) {
  const [activeTab, setActiveTab] = useState<ViewerTab>('3d')

  const glbAsset  = assets.find((a) => a.asset_type === 'export_glb')
  const meshAsset = assets.find((a) => ['mesh_clean', 'mesh_raw'].includes(a.asset_type ?? ''))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Onglets */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        display: 'flex', padding: '0 14px', flexShrink: 0,
      }}>
        {VIEWER_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 12px', fontSize: '11px',
              color: activeTab === key ? 'var(--ac)' : 'var(--tx-2)',
              borderBottom: `2px solid ${activeTab === key ? 'var(--ac)' : 'transparent'}`,
              display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'color 0.1s',
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div style={{
        flex: 1, background: 'var(--bg-2)', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(var(--tx-0) 1px, transparent 1px), linear-gradient(90deg, var(--tx-0) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {activeTab === '3d'     && <ModelViewer assetId={glbAsset?.id  as string ?? null} />}
        {activeTab === 'mesh'   && <ModelViewer assetId={meshAsset?.id as string ?? null} />}
        {(activeTab === 'photos' || activeTab === 'stacked') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--border-2)" strokeWidth="1.2">
              <rect x="3" y="7" width="26" height="18" rx="2" />
              <circle cx="16" cy="16" r="5" /><circle cx="16" cy="16" r="2" />
            </svg>
            <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>
              {activeTab === 'photos'
                ? 'Galerie photos brutes — disponible après acquisition'
                : 'Images focus stacked — disponibles après stacking'}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
        padding: '8px 14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
          {glbAsset
            ? `GLB disponible · session ${session.status}`
            : `Modèle non disponible · statut : ${session.status}`}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            disabled={!glbAsset}
            onClick={() => glbAsset && window.open(assetsApi.downloadUrl(String(glbAsset.id)))}
            style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--ac-bg)', color: 'var(--ac-tx)', border: '1px solid var(--ac-bd)',
              cursor: glbAsset ? 'pointer' : 'not-allowed', opacity: glbAsset ? 1 : 0.5,
            }}
          >
            Télécharger GLB
          </button>
          <button
            disabled={!glbAsset}
            style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: 'var(--radius-md)',
              background: glbAsset ? 'var(--ac)' : 'var(--bg-3)',
              color: glbAsset ? 'var(--bg-1)' : 'var(--tx-2)',
              border: 'none', cursor: glbAsset ? 'pointer' : 'not-allowed', fontWeight: 500,
            }}
          >
            Exporter
          </button>
        </div>
      </div>
    </div>
  )
}