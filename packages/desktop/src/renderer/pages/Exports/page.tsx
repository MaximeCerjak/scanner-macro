import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sessionsApi, assetsApi } from '../../api/client'
import type { SessionRead, AssetRead } from '../../api/client'
import { statusColors, Spinner, ErrorState } from '../../components/ui/Shared'
import { ExportConfigModal } from './components/ExportConfigModal'

// ─── Constantes ───────────────────────────────────────────────────────────────

type ViewMode = 'sessions' | 'timeline'

// Assets exportables (excluant les intermédiaires du pipeline)
const EXPORTABLE_TYPES = new Set([
  'export_glb', 'export_obj', 'export_stl', 'manifest',
])

// Assets "résultats" du pipeline — affichés en lecture seule
const PIPELINE_TYPES = new Set([
  'sparse_cloud', 'dense_cloud', 'mesh_raw', 'mesh_clean', 'texture', 'edof_stack',
])

const ASSET_CONFIG: Record<string, { label: string; ext: string; color: string; icon: string }> = {
  export_glb:    { label: 'GLB',          ext: '.glb',  color: 'var(--ac)',   icon: '3D' },
  export_obj:    { label: 'OBJ',          ext: '.obj',  color: 'var(--info)', icon: '3D' },
  export_stl:    { label: 'STL',          ext: '.stl',  color: 'var(--wn)',   icon: '3D' },
  manifest:      { label: 'Manifeste',    ext: '.json', color: 'var(--tx-2)', icon: '{}'  },
  sparse_cloud:  { label: 'Nuage sparse', ext: '',      color: 'var(--tx-2)', icon: '·'  },
  dense_cloud:   { label: 'Nuage dense',  ext: '',      color: 'var(--tx-2)', icon: '··' },
  mesh_raw:      { label: 'Mesh brut',    ext: '',      color: 'var(--tx-2)', icon: '△'  },
  mesh_clean:    { label: 'Mesh propre',  ext: '',      color: 'var(--tx-2)', icon: '▲'  },
  texture:       { label: 'Texture',      ext: '',      color: 'var(--tx-2)', icon: '□'  },
  edof_stack:    { label: 'Stack EDOF',   ext: '',      color: 'var(--tx-2)', icon: '≡'  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024)        return `${bytes} o`
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} Mo`
  return `${(bytes / 1024 ** 3).toFixed(2)} Go`
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const API_BASE = 'http://localhost:8001'

// ─── AssetRow — ligne dans les deux vues ─────────────────────────────────────

function AssetRow({
  asset,
  showSession,
  sessionName,
  sessionId,
}: {
  asset: AssetRead
  showSession?: boolean
  sessionName?: string
  sessionId?: string
}) {
  const navigate = useNavigate()
  const cfg = ASSET_CONFIG[asset.asset_type] ?? { label: asset.asset_type, ext: '', color: 'var(--tx-2)', icon: '?' }
  const isDownloadable = EXPORTABLE_TYPES.has(asset.asset_type)
  const isPipeline = PIPELINE_TYPES.has(asset.asset_type)

  function handleDownload() {
    // Ouvre la presigned URL dans un nouvel onglet — le navigateur gère le download
    window.open(`${API_BASE}/assets/${String(asset.id)}/download`, '_blank')
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '7px 10px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '4px',
      opacity: isPipeline ? 0.7 : 1,
    }}>
      {/* Icône type */}
      <div style={{
        width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10px', fontFamily: 'var(--font-mono)',
        color: cfg.color, flexShrink: 0, fontWeight: 700,
      }}>
        {cfg.icon}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: cfg.color }}>
            {cfg.label}{cfg.ext}
          </span>
          {showSession && sessionName && (
            <button
              onClick={() => sessionId && navigate(`/sessions/${sessionId}`)}
              style={{
                fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '140px',
              }}
            >
              {sessionName}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
            {formatSize(asset.size_bytes)}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>
            {formatDateShort(asset.created_at)}
          </span>
          {asset.checksum_sha256 && (
            <span
              title={asset.checksum_sha256}
              style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)', cursor: 'help' }}
            >
              sha256: {asset.checksum_sha256.slice(0, 8)}…
            </span>
          )}
        </div>
      </div>

      {/* Bouton download */}
      {isDownloadable ? (
        <button
          onClick={handleDownload}
          style={{
            padding: '5px 10px', borderRadius: 'var(--radius-md)',
            background: 'var(--ac-bg)', color: 'var(--ac-tx)',
            border: '1px solid var(--ac-bd)', cursor: 'pointer',
            fontSize: '11px', fontWeight: 500, flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '5px',
            transition: 'opacity 0.1s',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5.5 1v7M2.5 6l3 3 3-3" />
            <line x1="1" y1="10" x2="10" y2="10" />
          </svg>
          Télécharger
        </button>
      ) : (
        <span style={{ fontSize: '10px', color: 'var(--tx-2)', flexShrink: 0, padding: '0 4px' }}>
          Pipeline
        </span>
      )}
    </div>
  )
}

// ─── SessionExportGroup ───────────────────────────────────────────────────────

function SessionExportGroup({
  session,
  assets,
  onExport,
}: {
  session: SessionRead
  assets: AssetRead[]
  onExport: (s: SessionRead) => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)
  const c = statusColors(session.status)

  const exportableAssets = assets.filter((a) => EXPORTABLE_TYPES.has(a.asset_type))
  const pipelineAssets   = assets.filter((a) => PIPELINE_TYPES.has(a.asset_type))
  const [showPipeline, setShowPipeline] = useState(false)

  const totalSize = assets.reduce((acc, a) => acc + (a.size_bytes ?? 0), 0)
  const canExport = session.status === 'processed' || session.status === 'done'

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      marginBottom: '8px', overflow: 'hidden', background: 'var(--bg-1)',
    }}>
      {/* En-tête */}
      <div
        style={{
          padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px',
          cursor: 'pointer', userSelect: 'none',
          background: open ? 'var(--bg-2)' : 'transparent',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.1s',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="var(--tx-2)" strokeWidth="1.8" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}
        >
          <path d="M3 2l4 3-4 3" />
        </svg>

        <span
          style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx-0)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          onClick={(e) => { e.stopPropagation(); navigate(`/sessions/${String(session.id)}`) }}
        >
          {session.name ?? `Session ${String(session.id).slice(0, 8)}`}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {totalSize > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--tx-2)', fontFamily: 'var(--font-mono)' }}>
              {formatSize(totalSize)}
            </span>
          )}
          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
            {session.status}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>
            {formatDateShort(session.created_at)}
          </span>
          {/* Bouton export configurable */}
          <button
            onClick={(e) => { e.stopPropagation(); onExport(session) }}
            disabled={!canExport}
            title={canExport ? 'Configurer et lancer l\'export' : 'Session pas encore prête pour l\'export'}
            style={{
              padding: '3px 10px', borderRadius: 'var(--radius-md)', fontSize: '11px', fontWeight: 500,
              background: canExport ? 'var(--ac)' : 'var(--bg-3)',
              color: canExport ? 'var(--bg-1)' : 'var(--tx-2)',
              border: 'none', cursor: canExport ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 1v6M2 5l3 3 3-3" />
              <line x1="1" y1="9" x2="9" y2="9" />
            </svg>
            Exporter
          </button>
        </div>
      </div>

      {/* Corps */}
      {open && (
        <div style={{ padding: '8px 10px' }}>
          {assets.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--tx-2)', padding: '6px 2px' }}>
              Aucun asset — le pipeline n'a pas encore produit de résultats
            </div>
          ) : (
            <>
              {/* Assets exportables */}
              {exportableAssets.length > 0 && (
                <>
                  {pipelineAssets.length > 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--tx-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                      Exports
                    </div>
                  )}
                  {exportableAssets.map((asset) => (
                    <AssetRow key={String(asset.id)} asset={asset} />
                  ))}
                </>
              )}

              {/* Assets pipeline — repliables */}
              {pipelineAssets.length > 0 && (
                <div style={{ marginTop: exportableAssets.length > 0 ? '8px' : '0' }}>
                  <button
                    onClick={() => setShowPipeline((v) => !v)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 5px',
                      fontSize: '10px', color: 'var(--tx-2)', display: 'flex', alignItems: 'center', gap: '5px',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5"
                      style={{ transition: 'transform 0.12s', transform: showPipeline ? 'rotate(90deg)' : 'rotate(0)' }}>
                      <path d="M2 1.5l3 2.5-3 2.5" />
                    </svg>
                    Assets pipeline ({pipelineAssets.length})
                  </button>
                  {showPipeline && pipelineAssets.map((asset) => (
                    <AssetRow key={String(asset.id)} asset={asset} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Timeline flat ────────────────────────────────────────────────────────────

function TimelineView({
  assets,
  sessionsById,
  onlyExportable,
}: {
  assets: AssetRead[]
  sessionsById: Map<string, SessionRead>
  onlyExportable: boolean
}) {
  const filtered = onlyExportable
    ? assets.filter((a) => EXPORTABLE_TYPES.has(a.asset_type))
    : assets

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  if (sorted.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <span style={{ fontSize: '12px', color: 'var(--tx-2)' }}>Aucun asset à afficher</span>
      </div>
    )
  }

  // Grouper par jour
  const byDay = new Map<string, AssetRead[]>()
  for (const asset of sorted) {
    const day = new Date(asset.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
    const arr = byDay.get(day) ?? []
    arr.push(asset)
    byDay.set(day, arr)
  }

  return (
    <div>
      {Array.from(byDay.entries()).map(([day, dayAssets]) => (
        <div key={day} style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '10px', color: 'var(--tx-2)', textTransform: 'capitalize',
            letterSpacing: '0.05em', marginBottom: '6px', paddingBottom: '4px',
            borderBottom: '1px solid var(--border)',
          }}>
            {day}
          </div>
          {dayAssets.map((asset) => {
            const session = sessionsById.get(String(asset.session_id))
            return (
              <AssetRow
                key={String(asset.id)}
                asset={asset}
                showSession
                sessionName={session?.name ?? `Session ${String(asset.session_id).slice(0, 8)}`}
                sessionId={String(asset.session_id)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function ExportsPage() {
  const [view,        setView]        = useState<ViewMode>('sessions')
  const [exportModal, setExportModal] = useState<SessionRead | null>(null)
  const [onlyExports, setOnlyExports] = useState(true)

  const { data: sessions = [], isLoading: loadingSessions, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn:  () => sessionsApi.list({ limit: 100 }),
    refetchInterval: 15_000,
  })

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['assets'],
    queryFn:  () => assetsApi.list({}),
    refetchInterval: 15_000,
  })

  const isLoading = loadingSessions || loadingAssets

  // Sessions qui ont au moins un asset
  const sessionsWithAssets = useMemo(
    () => sessions.filter((s) => assets.some((a) => String(a.session_id) === String(s.id))),
    [sessions, assets]
  )

  // Map session_id → session
  const sessionsById = useMemo(
    () => new Map(sessions.map((s) => [String(s.id), s])),
    [sessions]
  )

  // Assets groupés par session
  const assetsBySession = useMemo(() => {
    const map = new Map<string, AssetRead[]>()
    for (const asset of assets) {
      const sid = String(asset.session_id)
      const arr = map.get(sid) ?? []
      arr.push(asset)
      map.set(sid, arr)
    }
    return map
  }, [assets])

  // Stats
  const stats = useMemo(() => ({
    exportable: assets.filter((a) => EXPORTABLE_TYPES.has(a.asset_type)).length,
    total:      assets.length,
    totalSize:  assets.reduce((acc, a) => acc + (a.size_bytes ?? 0), 0),
  }), [assets])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Modale export configurable */}
      {exportModal && (
        <ExportConfigModal
          session={exportModal}
          onClose={() => setExportModal(null)}
        />
      )}

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        padding: '10px 18px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--tx-0)' }}>Exports</div>
          <div style={{ fontSize: '11px', color: 'var(--tx-2)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {isLoading
              ? 'Chargement…'
              : `${stats.exportable} fichier${stats.exportable !== 1 ? 's' : ''} exportable${stats.exportable !== 1 ? 's' : ''} · ${formatSize(stats.totalSize)} total`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filtre exportables uniquement */}
          <button
            onClick={() => setOnlyExports((v) => !v)}
            style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--radius-md)',
              border: onlyExports ? '1px solid var(--ac-bd)' : '1px solid var(--border)',
              background: onlyExports ? 'var(--ac-bg)' : 'var(--bg-2)',
              color: onlyExports ? 'var(--ac-tx)' : 'var(--tx-1)',
              cursor: 'pointer', transition: 'all 0.1s',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 1v6M2 5l3 3 3-3" /><line x1="1" y1="9" x2="9" y2="9" />
            </svg>
            Exports seulement
          </button>

          {/* Toggle vue */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {([
              { key: 'sessions' as ViewMode, label: 'Sessions',
                icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="9" height="3.5" rx="1" /><rect x="1" y="6.5" width="9" height="3.5" rx="1" /></svg> },
              { key: 'timeline' as ViewMode, label: 'Timeline',
                icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="2" x2="1" y2="10" /><circle cx="1" cy="3" r="1.2" fill="currentColor" stroke="none" /><circle cx="1" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="1" cy="9" r="1.2" fill="currentColor" stroke="none" /><line x1="3" y1="3" x2="10" y2="3" /><line x1="3" y1="6" x2="8" y2="6" /><line x1="3" y1="9" x2="10" y2="9" /></svg> },
            ] as const).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                title={label}
                style={{
                  padding: '5px 10px', background: view === key ? 'var(--ac-bg)' : 'transparent',
                  color: view === key ? 'var(--ac-tx)' : 'var(--tx-2)',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', transition: 'all 0.1s',
                }}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Corps ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <Spinner label="Chargement des assets…" />
          </div>
        )}
        {isError && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <ErrorState message="Orchestrateur injoignable — lancer l'API sur localhost:8001" />
          </div>
        )}
        {!isLoading && !isError && assets.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '200px', gap: '10px',
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--border-2)" strokeWidth="1.2" style={{ opacity: 0.5 }}>
              <rect x="6" y="4" width="28" height="34" rx="2" />
              <path d="M14 12h12M14 18h12M14 24h8" />
            </svg>
            <span style={{ fontSize: '12px', color: 'var(--tx-2)' }}>
              Aucun asset — lancer le pipeline de traitement sur une session
            </span>
          </div>
        )}

        {!isLoading && !isError && assets.length > 0 && (
          <>
            {view === 'sessions' && (
              <div>
                {sessionsWithAssets.map((session) => (
                  <SessionExportGroup
                    key={String(session.id)}
                    session={session}
                    assets={assetsBySession.get(String(session.id)) ?? []}
                    onExport={setExportModal}
                  />
                ))}
              </div>
            )}
            {view === 'timeline' && (
              <TimelineView
                assets={assets}
                sessionsById={sessionsById}
                onlyExportable={onlyExports}
              />
            )}
          </>
        )}
      </div>

      {/* ── Footer stats ────────────────────────────────────────────────────── */}
      {!isLoading && assets.length > 0 && (
        <div style={{
          background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
          padding: '6px 18px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          {[
            { label: 'Assets total',     value: String(stats.total),     color: 'var(--tx-1)' },
            { label: 'Exportables',      value: String(stats.exportable), color: 'var(--ac-tx)' },
            { label: 'Taille totale',    value: formatSize(stats.totalSize), color: 'var(--tx-1)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 500, color }}>{value}</span>
              <span style={{ fontSize: '10px', color: 'var(--tx-2)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}